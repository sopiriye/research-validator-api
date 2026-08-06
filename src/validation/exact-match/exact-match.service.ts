import { Injectable } from '@nestjs/common';
import { ProjectRecordStatus } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { ProjectCandidate } from '../types/project-candidate.type';

@Injectable()
export class ExactMatchService {
  constructor(private readonly database: DatabaseService) {}

  async find(
    departmentId: string,
    normalizedProjectName: string,
  ): Promise<ProjectCandidate | null> {
    const record = await this.database.projectRecord.findFirst({
      where: {
        departmentId,
        normalizedProjectName,
        status: ProjectRecordStatus.ACTIVE,
        deletedAt: null,
      },
      include: { programme: { select: { code: true } } },
    });
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      projectName: record.projectName,
      normalizedProjectName: record.normalizedProjectName,
      yearOfCompletion: record.yearOfCompletion,
      programmeCode: record.programme.code,
      abstract: record.abstract,
    };
  }
}
