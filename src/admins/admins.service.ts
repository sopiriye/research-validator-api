import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Admin,
  AdminRole,
  AdminStatus,
  AuditAction,
  AuditEntityType,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { PasswordService } from '../common/security/password.service';
import { DatabaseService } from '../database/database.service';
import { DepartmentsService } from '../departments/departments.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';

@Injectable()
export class AdminsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly departments: DepartmentsService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(query: AdminQueryDto) {
    const where: Prisma.AdminWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [admins, totalItems] = await Promise.all([
      this.database.admin.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.database.admin.count({ where }),
    ]);

    return {
      admins: admins.map((admin) => this.toAdminResponse(admin)),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
      },
    };
  }

  async findOne(id: string) {
    return this.toAdminResponse(await this.getAdminOrThrow(id));
  }

  async create(actor: AuthenticatedAdmin, dto: CreateAdminDto) {
    const existing = await this.database.admin.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        'An administrator with this email already exists.',
      );
    }

    const department = await this.departments.getDefaultDepartment();
    const admin = await this.database.transaction(async (tx) => {
      const created = await tx.admin.create({
        data: {
          departmentId: department.id,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash: await this.passwordService.hash(dto.password),
          role: dto.role,
          status: AdminStatus.ACTIVE,
          mustChangePassword: true,
          createdByAdminId: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          departmentId: department.id,
          adminId: actor.id,
          action: AuditAction.CREATE,
          entityType: AuditEntityType.ADMIN,
          entityId: created.id,
          description: 'Administrator account created.',
          newValues: {
            fullName: created.fullName,
            email: created.email,
            role: created.role,
          },
        },
      });

      return created;
    });

    return this.toAdminResponse(admin);
  }

  async update(actor: AuthenticatedAdmin, id: string, dto: UpdateAdminDto) {
    if (!dto.fullName && !dto.email && !dto.role) {
      throw new BadRequestException(
        'At least one administrator field must be provided.',
      );
    }

    const updated = await this.database.transaction(async (tx) => {
      const existing = await this.getAdminOrThrow(id, tx);
      if (dto.email && dto.email !== existing.email) {
        const emailOwner = await tx.admin.findUnique({
          where: { email: dto.email },
        });
        if (emailOwner) {
          throw new ConflictException(
            'An administrator with this email already exists.',
          );
        }
      }

      if (actor.id === id && dto.role && dto.role !== existing.role) {
        throw new ForbiddenException(
          'Administrators cannot change their own role.',
        );
      }

      if (
        existing.role === AdminRole.SUPER_ADMIN &&
        existing.status === AdminStatus.ACTIVE &&
        dto.role === AdminRole.ADMIN
      ) {
        await this.assertAnotherActiveSuperAdmin(tx, id);
      }

      const next = await tx.admin.update({
        where: { id },
        data: {
          ...(dto.fullName ? { fullName: dto.fullName } : {}),
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.role ? { role: dto.role } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          departmentId: existing.departmentId,
          adminId: actor.id,
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.ADMIN,
          entityId: id,
          description: 'Administrator account updated.',
          oldValues: this.auditValues(existing),
          newValues: this.auditValues(next),
        },
      });
      return next;
    });

    return this.toAdminResponse(updated);
  }

  async updateStatus(
    actor: AuthenticatedAdmin,
    id: string,
    dto: UpdateAdminStatusDto,
  ) {
    const updated = await this.database.transaction(async (tx) => {
      const existing = await this.getAdminOrThrow(id, tx);
      if (existing.status === dto.status) {
        return existing;
      }

      if (
        existing.role === AdminRole.SUPER_ADMIN &&
        existing.status === AdminStatus.ACTIVE &&
        dto.status !== AdminStatus.ACTIVE
      ) {
        await this.assertAnotherActiveSuperAdmin(tx, id);
      }

      const next = await tx.admin.update({
        where: { id },
        data: { status: dto.status },
      });

      if (dto.status !== AdminStatus.ACTIVE) {
        await tx.adminSession.updateMany({
          where: { adminId: id, status: SessionStatus.ACTIVE },
          data: {
            status: SessionStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: 'Administrator account disabled',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          departmentId: existing.departmentId,
          adminId: actor.id,
          action:
            dto.status === AdminStatus.ACTIVE
              ? AuditAction.ADMIN_ACTIVATED
              : AuditAction.ADMIN_DEACTIVATED,
          entityType: AuditEntityType.ADMIN,
          entityId: id,
          description: `Administrator account ${
            dto.status === AdminStatus.ACTIVE ? 'activated' : 'disabled'
          }.`,
          oldValues: { status: existing.status },
          newValues: { status: next.status },
        },
      });
      return next;
    });

    return this.toAdminResponse(updated);
  }

  async resetPassword(
    actor: AuthenticatedAdmin,
    id: string,
    dto: ResetAdminPasswordDto,
  ): Promise<void> {
    if (actor.id === id) {
      throw new ForbiddenException(
        'Use the account recovery flow to reset your own password.',
      );
    }

    await this.database.transaction(async (tx) => {
      const existing = await this.getAdminOrThrow(id, tx);
      const passwordHash = await this.passwordService.hash(dto.newPassword);
      await tx.admin.update({
        where: { id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.adminSession.updateMany({
        where: { adminId: id, status: SessionStatus.ACTIVE },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
          revocationReason: 'Password reset by Super Administrator',
        },
      });
      await tx.auditLog.create({
        data: {
          departmentId: existing.departmentId,
          adminId: actor.id,
          action: AuditAction.PASSWORD_CHANGED,
          entityType: AuditEntityType.ADMIN,
          entityId: id,
          description: 'Administrator password reset by Super Administrator.',
        },
      });
    });
  }

  private async getAdminOrThrow(
    id: string,
    client: Prisma.TransactionClient | DatabaseService = this.database,
  ): Promise<Admin> {
    const admin = await client.admin.findFirst({
      where: { id, deletedAt: null },
    });
    if (!admin) {
      throw new NotFoundException('Administrator not found.');
    }
    return admin;
  }

  private async assertAnotherActiveSuperAdmin(
    tx: Prisma.TransactionClient,
    targetId: string,
  ): Promise<void> {
    const remaining = await tx.admin.count({
      where: {
        id: { not: targetId },
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (remaining === 0) {
      throw new ConflictException(
        'The final active Super Administrator cannot be disabled or demoted.',
      );
    }
  }

  private toAdminResponse(admin: Admin) {
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
      updatedAt: admin.updatedAt,
    };
  }

  private auditValues(admin: Admin) {
    return {
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    };
  }
}
