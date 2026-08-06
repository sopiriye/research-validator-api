import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('admin/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() dto: CreateProjectDto,
  ) {
    const data = await this.projectsService.create(admin, dto);
    return {
      success: true,
      message: 'Project record created successfully.',
      data,
    };
  }

  @Get()
  async findAll(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Query() query: ProjectQueryDto,
  ) {
    const data = await this.projectsService.findAll(admin, query);
    return {
      success: true,
      message: 'Project records retrieved successfully.',
      data,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.projectsService.findOne(admin, id);
    return {
      success: true,
      message: 'Project record retrieved successfully.',
      data,
    };
  }

  @Patch(':id')
  async update(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const data = await this.projectsService.update(admin, id, dto);
    return {
      success: true,
      message: 'Project record updated successfully.',
      data,
    };
  }

  @Delete(':id')
  async remove(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.projectsService.remove(admin, id);
    return { success: true, message: 'Project record deleted successfully.' };
  }
}
