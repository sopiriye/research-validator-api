import { Injectable } from '@nestjs/common';
import { SimilarityAlgorithm } from './similarity-algorithm.interface';

@Injectable()
export class TrigramSimilarityService implements SimilarityAlgorithm {
  calculate(source: string, candidate: string): number {
    if (source === candidate) {
      return 1;
    }
    if (!source || !candidate) {
      return 0;
    }

    const sourceTrigrams = this.toTrigrams(source);
    const candidateTrigrams = this.toTrigrams(candidate);
    let intersection = 0;
    for (const trigram of sourceTrigrams) {
      if (candidateTrigrams.has(trigram)) {
        intersection += 1;
      }
    }

    return (2 * intersection) / (sourceTrigrams.size + candidateTrigrams.size);
  }

  private toTrigrams(value: string): Set<string> {
    const padded = `  ${value} `;
    const trigrams = new Set<string>();
    for (let index = 0; index <= padded.length - 3; index += 1) {
      trigrams.add(padded.slice(index, index + 3));
    }
    return trigrams;
  }
}
