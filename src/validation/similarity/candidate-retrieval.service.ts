import { Injectable } from '@nestjs/common';
import { ProgrammeCode, ProjectRecordStatus } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { getPositiveIntegerEnv } from '../../auth/auth.config';
import { ProjectCandidate } from '../types/project-candidate.type';

interface CandidateRow {
  id: string;
  projectName: string;
  normalizedProjectName: string;
  yearOfCompletion: number;
  programmeCode: ProgrammeCode;
  abstract: string;
}

@Injectable()
export class CandidateRetrievalService {
  private readonly candidateLimit = Math.min(
    getPositiveIntegerEnv('SIMILARITY_CANDIDATE_LIMIT', 50),
    50,
  );
  private readonly preliminaryThreshold = this.getThreshold(
    'SIMILARITY_PRELIMINARY_THRESHOLD',
    0.2,
  );

  constructor(private readonly database: DatabaseService) {}

  async retrieve(
    departmentId: string,
    normalizedQuery: string,
  ): Promise<ProjectCandidate[]> {
    const firstToken = normalizedQuery.split(' ')[0];
    const rows = await this.database.$queryRaw<CandidateRow[]>`
      SELECT
        r."id",
        r."project_name" AS "projectName",
        r."normalized_project_name" AS "normalizedProjectName",
        r."year_of_completion" AS "yearOfCompletion",
        p."code" AS "programmeCode",
        r."abstract"
      FROM "project_records" AS r
      INNER JOIN "programmes" AS p ON p."id" = r."programme_id"
      WHERE r."department_id" = ${departmentId}::uuid
        AND r."status" = CAST(${ProjectRecordStatus.ACTIVE} AS "project_record_status")
        AND r."deleted_at" IS NULL
        AND (
          similarity(r."normalized_project_name", ${normalizedQuery}) >= ${this.preliminaryThreshold}
          OR r."normalized_project_name" LIKE '%' || ${firstToken} || '%'
        )
      ORDER BY similarity(r."normalized_project_name", ${normalizedQuery}) DESC, r."created_at" DESC
      LIMIT ${this.candidateLimit}
    `;
    return rows;
  }

  private getThreshold(name: string, fallback: number): number {
    const parsed = Number.parseFloat(process.env[name] ?? '');
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
      ? parsed
      : fallback;
  }
}
