import { Injectable } from '@nestjs/common';
import { SimilarityAlgorithm } from './similarity-algorithm.interface';

@Injectable()
export class TokenSimilarityService implements SimilarityAlgorithm {
  calculate(source: string, candidate: string): number {
    const sourceTokens = new Set(source.split(/\s+/).filter(Boolean));
    const candidateTokens = new Set(candidate.split(/\s+/).filter(Boolean));
    if (sourceTokens.size === 0 || candidateTokens.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const token of sourceTokens) {
      if (candidateTokens.has(token)) {
        intersection += 1;
      }
    }
    const union = new Set([...sourceTokens, ...candidateTokens]).size;
    return union === 0 ? 0 : intersection / union;
  }
}
