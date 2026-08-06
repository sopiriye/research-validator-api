import { Injectable } from '@nestjs/common';
import { ProgrammeCode, ProjectRecordStatus } from '@prisma/client';
import { toProgrammeLabel } from '../common/utils/programme.utils';
import { DatabaseService } from '../database/database.service';
import { DepartmentsService } from '../departments/departments.service';

const programmeCodes = [
  ProgrammeCode.PGD,
  ProgrammeCode.MSC,
  ProgrammeCode.PHD,
];

@Injectable()
export class ReportsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly departments: DepartmentsService,
  ) {}

  async summary() {
    const department = await this.departments.getDefaultDepartment();
    const where = this.activeProjectWhere(department.id);
    const [totalProjects, grouped] = await Promise.all([
      this.database.projectRecord.count({ where }),
      this.database.projectRecord.groupBy({
        by: ['programmeId'],
        where,
        _count: { _all: true },
      }),
    ]);
    const programmeCounts = await this.programmeCounts(
      department.id,
      grouped.map((item) => ({
        programmeId: item.programmeId,
        count: item._count._all,
      })),
    );

    return {
      totalProjects,
      totalPGDProjects: programmeCounts.get(ProgrammeCode.PGD) ?? 0,
      totalMScProjects: programmeCounts.get(ProgrammeCode.MSC) ?? 0,
      totalPhDProjects: programmeCounts.get(ProgrammeCode.PHD) ?? 0,
    };
  }

  async projectsByYear() {
    const department = await this.departments.getDefaultDepartment();
    const grouped = await this.database.projectRecord.groupBy({
      by: ['yearOfCompletion'],
      where: this.activeProjectWhere(department.id),
      _count: { _all: true },
      orderBy: { yearOfCompletion: 'asc' },
    });
    return grouped.map((item) => ({
      yearOfCompletion: item.yearOfCompletion,
      totalProjects: item._count._all,
    }));
  }

  async projectsByProgramme() {
    const department = await this.departments.getDefaultDepartment();
    const grouped = await this.database.projectRecord.groupBy({
      by: ['programmeId'],
      where: this.activeProjectWhere(department.id),
      _count: { _all: true },
    });
    const programmeCounts = await this.programmeCounts(
      department.id,
      grouped.map((item) => ({
        programmeId: item.programmeId,
        count: item._count._all,
      })),
    );

    return programmeCodes.map((programme) => ({
      programme: toProgrammeLabel(programme),
      totalProjects: programmeCounts.get(programme) ?? 0,
    }));
  }

  async projectsByProgrammeYear() {
    const department = await this.departments.getDefaultDepartment();
    const grouped = await this.database.projectRecord.groupBy({
      by: ['programmeId', 'yearOfCompletion'],
      where: this.activeProjectWhere(department.id),
      _count: { _all: true },
      orderBy: [{ yearOfCompletion: 'asc' }, { programmeId: 'asc' }],
    });
    const programmes = await this.database.programme.findMany({
      where: { departmentId: department.id },
      select: { id: true, code: true },
    });
    const programmeById = new Map(
      programmes.map((programme) => [programme.id, programme.code]),
    );

    return grouped.map((item) => ({
      yearOfCompletion: item.yearOfCompletion,
      programme: toProgrammeLabel(
        programmeById.get(item.programmeId) ?? ProgrammeCode.PGD,
      ),
      totalProjects: item._count._all,
    }));
  }

  private activeProjectWhere(departmentId: string) {
    return {
      departmentId,
      status: ProjectRecordStatus.ACTIVE,
      deletedAt: null,
    };
  }

  private async programmeCounts(
    departmentId: string,
    records: Array<{ programmeId: string; count: number }>,
  ): Promise<Map<ProgrammeCode, number>> {
    const programmes = await this.database.programme.findMany({
      where: { departmentId, deletedAt: null },
      select: { id: true, code: true },
    });
    const codeById = new Map(
      programmes.map((programme) => [programme.id, programme.code]),
    );
    return new Map(
      records.flatMap((record) => {
        const code = codeById.get(record.programmeId);
        return code ? [[code, record.count] as [ProgrammeCode, number]] : [];
      }),
    );
  }
}
