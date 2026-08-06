import { Module } from '@nestjs/common';
import { DepartmentsSeedService } from './departments.seed.service';
import { DepartmentsService } from './departments.service';

@Module({
  providers: [DepartmentsService, DepartmentsSeedService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
