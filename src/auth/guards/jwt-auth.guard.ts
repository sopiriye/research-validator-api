import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminStatus, SessionStatus } from '@prisma/client';
import { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import { AuthenticatedAdmin } from '../../common/types/authenticated-admin.type';
import { AccessTokenPayload } from '../types/access-token-payload.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'The access token is invalid or expired.',
      );
    }

    const session = await this.database.adminSession.findFirst({
      where: {
        id: payload.sid,
        adminId: payload.sub,
        jwtIdentifier: payload.jti,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        admin: {
          status: AdminStatus.ACTIVE,
          deletedAt: null,
        },
      },
      include: { admin: true },
    });

    if (!session) {
      throw new UnauthorizedException(
        'The current session is no longer active.',
      );
    }

    const admin: AuthenticatedAdmin = {
      id: session.admin.id,
      email: session.admin.email,
      fullName: session.admin.fullName,
      role: session.admin.role,
      departmentId: session.admin.departmentId,
      sessionId: session.id,
    };

    (request as Request & { admin: AuthenticatedAdmin }).admin = admin;
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : undefined;
  }
}
