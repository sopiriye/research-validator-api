import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ProgrammeCode } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  DEFAULT_DEPARTMENT_CODE,
  DEFAULT_DEPARTMENT_NAME,
  DEFAULT_INSTITUTION_NAME,
} from './departments.constants';

@Injectable()
export class DepartmentsSeedService implements OnApplicationBootstrap {
  constructor(private readonly database: DatabaseService) {}

  async onApplicationBootstrap(): Promise<void> {
    const department = await this.database.department.upsert({
      where: { code: DEFAULT_DEPARTMENT_CODE },
      create: {
        code: DEFAULT_DEPARTMENT_CODE,
        name: DEFAULT_DEPARTMENT_NAME,
        institutionName: DEFAULT_INSTITUTION_NAME,
        description: 'Information Technology Education Department',
      },
      update: {
        name: DEFAULT_DEPARTMENT_NAME,
        institutionName: DEFAULT_INSTITUTION_NAME,
        isActive: true,
        deletedAt: null,
      },
    });

    await Promise.all([
      this.seedProgramme(
        department.id,
        ProgrammeCode.PGD,
        'Postgraduate Diploma',
      ),
      this.seedProgramme(department.id, ProgrammeCode.MSC, 'Master of Science'),
      this.seedProgramme(
        department.id,
        ProgrammeCode.PHD,
        'Doctor of Philosophy',
      ),
    ]);
  }

  private async seedProgramme(
    departmentId: string,
    code: ProgrammeCode,
    displayName: string,
  ): Promise<void> {
    await this.database.programme.upsert({
      where: {
        departmentId_code: { departmentId, code },
      },
      create: { departmentId, code, displayName },
      update: { displayName, isActive: true, deletedAt: null },
    });
  }
}
