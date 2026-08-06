import { ProgrammeCode } from '@prisma/client';
import { LevenshteinSimilarityService } from './algorithms/levenshtein-similarity.service';
import { TokenSimilarityService } from './algorithms/token-similarity.service';
import { TrigramSimilarityService } from './algorithms/trigram-similarity.service';
import { ScoreAggregatorService } from './score-aggregator.service';
import { SimilarityEngineService } from './similarity-engine.service';

describe('SimilarityEngineService', () => {
  const service = new SimilarityEngineService(
    new LevenshteinSimilarityService(),
    new TrigramSimilarityService(),
    new TokenSimilarityService(),
    new ScoreAggregatorService(),
  );

  it('returns ranked explainable results above the configured threshold', () => {
    const results = service.rank(
      'impact of social media on student performance',
      [
        {
          id: '1',
          projectName: 'The impact of social media on student performance',
          normalizedProjectName:
            'the impact of social media on student performance',
          yearOfCompletion: 2024,
          programmeCode: ProgrammeCode.MSC,
          abstract: 'A study abstract.',
        },
        {
          id: '2',
          projectName: 'Network infrastructure maintenance',
          normalizedProjectName: 'network infrastructure maintenance',
          yearOfCompletion: 2023,
          programmeCode: ProgrammeCode.PGD,
          abstract: '',
        },
      ],
      0.6,
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: '1',
      programme: 'MSc',
      matchType: 'SIMILAR',
      hasAbstract: true,
    });
    expect(results[0].deterministicScore).toBeGreaterThanOrEqual(0.6);
    expect(typeof results[0].algorithmScores.levenshtein).toBe('number');
    expect(typeof results[0].algorithmScores.trigram).toBe('number');
    expect(typeof results[0].algorithmScores.tokenSimilarity).toBe('number');
  });

  it('does not emit candidates below the threshold', () => {
    const results = service.rank(
      'education technology adoption',
      [
        {
          id: '1',
          projectName: 'Agricultural water management',
          normalizedProjectName: 'agricultural water management',
          yearOfCompletion: 2024,
          programmeCode: ProgrammeCode.PHD,
          abstract: '',
        },
      ],
      0.6,
      5,
    );

    expect(results).toEqual([]);
  });
});
