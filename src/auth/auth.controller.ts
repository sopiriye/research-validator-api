import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { LoginAdminDto } from './dto/login-admin.dto';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth-admin/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginAdminDto, @Req() request: Request) {
    const data = await this.authService.login(
      dto,
      this.getRequestMetadata(request),
    );
    return { success: true, message: 'Login successful', data };
  }

  @Post('auth-admin/logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() request: Request,
  ) {
    await this.authService.logout(admin, this.getRequestMetadata(request));
    return { success: true, message: 'Logout successful' };
  }

  @Get('auth-admin/me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return {
      success: true,
      data: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  @Post('internal/super-admin/register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async registerSuperAdmin(@Body() dto: RegisterSuperAdminDto) {
    const admin = await this.authService.registerDevelopmentSuperAdmin(dto);
    return {
      success: true,
      message: 'Registration successful',
      data: { admin },
    };
  }

  private getRequestMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
