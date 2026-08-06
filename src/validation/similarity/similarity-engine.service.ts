import { Injectable } from '@nestjs/common';
import { toProgrammeLabel } from '../../common/utils/programme.utils';
import { LevenshteinSimilarityService } from './algorithms/levenshtein-similarity.service';
import { TokenSimilarityService } from './algorithms/token-similarity.service';
import { TrigramSimilarityService } from './algorithms/trigram-similarity.service';
import { ScoreAggregatorService } from './score-aggregator.service';
import { ProjectCandidate } from '../types/project-candidate.type';

@Injectable()
export class SimilarityEngineService {
  constructor(
    private readonly levenshtein: LevenshteinSimilarityService,
    private readonly trigram: TrigramSimilarityService,
    private readonly tokenSimilarity: TokenSimilarityService,
    private readonly scoreAggregator: ScoreAggregatorService,
  ) {}

  rank(
    normalizedQuery: string,
    candidates: ProjectCandidate[],
    threshold: number,
    limit: number,
  ) {
    return candidates
      .map((candidate) => {
        const result = this.scoreAggregator.aggregate(
          {
            levenshtein: this.levenshtein.calculate(
              normalizedQuery,
              candidate.normalizedProjectName,
            ),
            trigram: this.trigram.calculate(
              normalizedQuery,
              candidate.normalizedProjectName,
            ),
            tokenSimilarity: this.tokenSimilarity.calculate(
              normalizedQuery,
              candidate.normalizedProjectName,
            ),
          },
          threshold,
        );
        return { candidate, result };
      })
      .filter(({ result }) => result.deterministicScore >= threshold)
      .sort(
        (left, right) =>
          right.result.deterministicScore - left.result.deterministicScore,
      )
      .slice(0, limit)
      .map(({ candidate, result }) => ({
        id: candidate.id,
        projectTitle: candidate.projectName,
        yearOfCompletion: candidate.yearOfCompletion,
        programme: toProgrammeLabel(candidate.programmeCode),
        matchType: 'SIMILAR' as const,
        hasAbstract: Boolean(candidate.abstract.trim()),
        algorithmScores: {
          levenshtein: this.round(result.algorithmScores.levenshtein),
          trigram: this.round(result.algorithmScores.trigram),
          tokenSimilarity: this.round(result.algorithmScores.tokenSimilarity),
        },
        deterministicScore: this.round(result.deterministicScore),
        classification: result.classification,
      }));
  }

  private round(value: number): number {
    return Number(value.toFixed(4));
  }
}
