import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AdminRole,
  AdminStatus,
  AuditAction,
  AuditEntityType,
  SessionStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { PasswordService } from '../common/security/password.service';
import { DatabaseService } from '../database/database.service';
import { DepartmentsService } from '../departments/departments.service';
import { getPositiveIntegerEnv } from './auth.config';
import { LoginAdminDto } from './dto/login-admin.dto';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';
import { AccessTokenPayload } from './types/access-token-payload.type';

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = getPositiveIntegerEnv(
    'JWT_ACCESS_TOKEN_TTL_SECONDS',
    900,
  );
  private readonly sessionTtlDays = getPositiveIntegerEnv(
    'AUTH_SESSION_TTL_DAYS',
    7,
  );
  private readonly maximumFailedAttempts = 5;

  constructor(
    private readonly database: DatabaseService,
    private readonly departments: DepartmentsService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginAdminDto, metadata: RequestMetadata) {
    const admin = await this.database.admin.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      await this.recordFailedLogin(admin?.id, admin?.departmentId, metadata);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verify(
      admin.passwordHash,
      dto.password,
    );
    if (!passwordMatches) {
      await this.recordFailedLogin(
        admin.id,
        admin.departmentId,
        metadata,
        admin.failedLoginAttempts,
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.sessionTtlDays * 24 * 60 * 60 * 1000,
    );
    const jwtIdentifier = randomUUID();
    const refreshTokenHash = this.hashOpaqueToken(randomUUID());

    const session = await this.database.adminSession.create({
      data: {
        adminId: admin.id,
        refreshTokenHash,
        jwtIdentifier,
        issuedAt: now,
        expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    await this.database.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const accessToken = await this.signAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      departmentId: admin.departmentId,
      sid: session.id,
      jti: jwtIdentifier,
    });

    await this.database.auditLog.create({
      data: {
        departmentId: admin.departmentId,
        adminId: admin.id,
        action: AuditAction.LOGIN,
        entityType: AuditEntityType.AUTH_SESSION,
        entityId: session.id,
        description: 'Administrator logged in.',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    return {
      accessToken,
      admin: this.toPublicAdmin(admin),
    };
  }

  async logout(
    admin: AuthenticatedAdmin,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    await this.database.adminSession.update({
      where: { id: admin.sessionId },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: now,
        revocationReason: 'Administrator logout',
      },
    });

    await this.database.auditLog.create({
      data: {
        departmentId: admin.departmentId,
        adminId: admin.id,
        action: AuditAction.LOGOUT,
        entityType: AuditEntityType.AUTH_SESSION,
        entityId: admin.sessionId,
        description: 'Administrator logged out.',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  async registerDevelopmentSuperAdmin(dto: RegisterSuperAdminDto) {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException(
        'This endpoint is disabled outside the development environment.',
      );
    }

    const existingSuperAdmin = await this.database.admin.count({
      where: { role: AdminRole.SUPER_ADMIN, deletedAt: null },
    });
    if (existingSuperAdmin > 0) {
      throw new ConflictException('A Super Administrator already exists.');
    }

    const existingEmail = await this.database.admin.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        'An administrator with this email already exists.',
      );
    }

    const department = await this.departments.getDefaultDepartment();
    const admin = await this.database.admin.create({
      data: {
        departmentId: department.id,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: await this.passwordService.hash(dto.password),
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
      },
    });

    await this.database.auditLog.create({
      data: {
        departmentId: department.id,
        action: AuditAction.CREATE,
        entityType: AuditEntityType.ADMIN,
        entityId: admin.id,
        description: 'Development Super Administrator registered.',
      },
    });

    return this.toPublicAdmin(admin);
  }

  toPublicAdmin(admin: {
    id: string;
    fullName: string;
    email: string;
    role: AdminRole;
  }) {
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    };
  }

  private async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtlSeconds,
    });
  }

  private hashOpaqueToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async recordFailedLogin(
    adminId: string | undefined,
    departmentId: string | undefined,
    metadata: RequestMetadata,
    currentAttempts = 0,
  ): Promise<void> {
    if (adminId) {
      const failedLoginAttempts = currentAttempts + 1;
      await this.database.admin.update({
        where: { id: adminId },
        data: {
          failedLoginAttempts,
          lockedUntil:
            failedLoginAttempts >= this.maximumFailedAttempts
              ? new Date(Date.now() + 15 * 60 * 1000)
              : null,
        },
      });
    }

    await this.database.auditLog.create({
      data: {
        departmentId,
        adminId,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.ADMIN,
        entityId: adminId,
        description: 'Failed administrator login attempt.',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        success: false,
      },
    });
  }
}
