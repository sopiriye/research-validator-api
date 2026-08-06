import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedAdmin } from '../types/authenticated-admin.type';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
    const request = context.switchToHttp().getRequest<Request>();
    return (request as Request & { admin: AuthenticatedAdmin }).admin;
  },
);
