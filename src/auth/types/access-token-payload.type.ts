import { AdminRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  departmentId: string;
  sid: string;
  jti: string;
}
