import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async summary() {
    const data = await this.reportsService.summary();
    return {
      success: true,
      message: 'Project report summary retrieved successfully.',
      data,
    };
  }

  @Get('projects-by-year')
  async projectsByYear() {
    const data = await this.reportsService.projectsByYear();
    return {
      success: true,
      message: 'Projects by year retrieved successfully.',
      data,
    };
  }

  @Get('projects-by-programme')
  async projectsByProgramme() {
    const data = await this.reportsService.projectsByProgramme();
    return {
      success: true,
      message: 'Projects by programme retrieved successfully.',
      data,
    };
  }

  @Get('projects-by-programme-year')
  async projectsByProgrammeYear() {
    const data = await this.reportsService.projectsByProgrammeYear();
    return {
      success: true,
      message: 'Projects by programme and year retrieved successfully.',
      data,
    };
  }
}
