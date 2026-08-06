import { AdminRole } from '@prisma/client';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  departmentId: string;
  sessionId: string;
}
