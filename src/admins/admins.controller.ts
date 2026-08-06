import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';

@Controller('admin-management/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  async findAll(@Query() query: AdminQueryDto) {
    const data = await this.adminsService.findAll(query);
    return {
      success: true,
      message: 'Administrators retrieved successfully.',
      data,
    };
  }

  @Post()
  async create(
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Body() dto: CreateAdminDto,
  ) {
    const admin = await this.adminsService.create(actor, dto);
    return {
      success: true,
      message: 'Administrator created successfully.',
      data: admin,
    };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const admin = await this.adminsService.findOne(id);
    return {
      success: true,
      message: 'Administrator retrieved successfully.',
      data: admin,
    };
  }

  @Patch(':id')
  async update(
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    const admin = await this.adminsService.update(actor, id, dto);
    return {
      success: true,
      message: 'Administrator updated successfully.',
      data: admin,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminStatusDto,
  ) {
    const admin = await this.adminsService.updateStatus(actor, id, dto);
    return {
      success: true,
      message: 'Administrator status updated successfully.',
      data: admin,
    };
  }

  @Patch(':id/reset-password')
  async resetPassword(
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetAdminPasswordDto,
  ) {
    await this.adminsService.resetPassword(actor, id, dto);
    return {
      success: true,
      message: 'Administrator password reset successfully.',
    };
  }
}
