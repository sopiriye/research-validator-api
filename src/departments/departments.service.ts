import { Injectable, NotFoundException } from '@nestjs/common';
import { Programme, ProgrammeCode } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { DEFAULT_DEPARTMENT_CODE } from './departments.constants';

@Injectable()
export class DepartmentsService {
  constructor(private readonly database: DatabaseService) {}

  async getDefaultDepartment() {
    const department = await this.database.department.findFirst({
      where: {
        code: DEFAULT_DEPARTMENT_CODE,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!department) {
      throw new NotFoundException('The IAUE ITE Department is not configured.');
    }

    return department;
  }

  async getActiveProgramme(
    departmentId: string,
    code: ProgrammeCode,
  ): Promise<Programme> {
    const programme = await this.database.programme.findFirst({
      where: {
        departmentId,
        code,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!programme) {
      throw new NotFoundException('The requested programme is not available.');
    }

    return programme;
  }
}
