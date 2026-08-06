import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProjectsService } from '../projects/projects.service';
import { ValidateProjectTitleDto } from './dto/validate-project-title.dto';
import { ValidationService } from './validation.service';

@Controller('projects')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post('validate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async validate(@Body() dto: ValidateProjectTitleDto) {
    const result = await this.validationService.validate(dto);
    return { success: true, ...result };
  }

  @Get(':id/abstract')
  async getAbstract(@Param('id', new ParseUUIDPipe()) id: string) {
    const result = await this.projectsService.getPublicAbstract(id);
    return { success: true, ...result };
  }
}
