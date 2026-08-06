import { Injectable } from '@nestjs/common';
import {
  AlgorithmScores,
  SimilarityClassification,
  SimilarityResult,
} from '../types/similarity-result.type';

@Injectable()
export class ScoreAggregatorService {
  aggregate(scores: AlgorithmScores, threshold: number): SimilarityResult {
    const deterministicScore = this.clamp(
      (scores.levenshtein + scores.trigram + scores.tokenSimilarity) / 3,
    );

    return {
      algorithmScores: scores,
      deterministicScore,
      classification: this.classify(deterministicScore, threshold),
    };
  }

  private classify(score: number, threshold: number): SimilarityClassification {
    if (score >= 0.85) {
      return 'HIGH_SIMILARITY';
    }
    if (score >= 0.7) {
      return 'REVIEW';
    }
    if (score >= threshold) {
      return 'WEAK_MATCH';
    }
    return 'NO_MATCH';
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
