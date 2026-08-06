import { BadRequestException, Injectable } from '@nestjs/common';
import { toProgrammeLabel } from '../common/utils/programme.utils';
import { sanitizePlainText } from '../common/utils/text.utils';
import { DepartmentsService } from '../departments/departments.service';
import { ExactMatchService } from './exact-match/exact-match.service';
import { TitleNormalizationService } from './normalization/title-normalization.service';
import { ValidateProjectTitleDto } from './dto/validate-project-title.dto';
import { CandidateRetrievalService } from './similarity/candidate-retrieval.service';
import { SimilarityEngineService } from './similarity/similarity-engine.service';

@Injectable()
export class ValidationService {
  private readonly similarityThreshold = this.getThreshold(
    'SIMILARITY_THRESHOLD',
    0.6,
  );
  private readonly resultLimit = Math.min(
    this.getPositiveInteger('SIMILARITY_RESULT_LIMIT', 5),
    10,
  );

  constructor(
    private readonly departments: DepartmentsService,
    private readonly titleNormalization: TitleNormalizationService,
    private readonly exactMatch: ExactMatchService,
    private readonly candidates: CandidateRetrievalService,
    private readonly similarityEngine: SimilarityEngineService,
  ) {}

  async validate(dto: ValidateProjectTitleDto) {
    const query = sanitizePlainText(dto.projectTitle);
    const normalizedQuery = this.titleNormalization.normalize(query);
    if (!normalizedQuery) {
      throw new BadRequestException(
        'Project title must contain letters or numbers.',
      );
    }

    const department = await this.departments.getDefaultDepartment();
    const exact = await this.exactMatch.find(department.id, normalizedQuery);
    if (exact) {
      return {
        status: 'DUPLICATE_FOUND',
        message: 'This project title already exists.',
        data: {
          query,
          normalizedQuery,
          exactMatches: [
            {
              id: exact.id,
              projectTitle: exact.projectName,
              yearOfCompletion: exact.yearOfCompletion,
              programme: toProgrammeLabel(exact.programmeCode),
              matchType: 'EXACT' as const,
              hasAbstract: Boolean(exact.abstract.trim()),
            },
          ],
          similarMatches: [],
        },
      };
    }

    const candidates = await this.candidates.retrieve(
      department.id,
      normalizedQuery,
    );
    const similarMatches = this.similarityEngine.rank(
      normalizedQuery,
      candidates,
      this.similarityThreshold,
      this.resultLimit,
    );
    if (similarMatches.length) {
      return {
        status: 'SIMILAR_MATCHES_FOUND',
        message:
          'No exact duplicate was found, but possible similar project titles exist.',
        data: { query, normalizedQuery, exactMatches: [], similarMatches },
      };
    }

    return {
      status: 'NO_MATCH_FOUND',
      message: 'No matching project title was found.',
      data: { query, normalizedQuery, exactMatches: [], similarMatches: [] },
    };
  }

  private getThreshold(name: string, fallback: number): number {
    const parsed = Number.parseFloat(process.env[name] ?? '');
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
      ? parsed
      : fallback;
  }

  private getPositiveInteger(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
