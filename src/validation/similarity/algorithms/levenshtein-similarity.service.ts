import { Injectable } from '@nestjs/common';
import { SimilarityAlgorithm } from './similarity-algorithm.interface';

@Injectable()
export class LevenshteinSimilarityService implements SimilarityAlgorithm {
  calculate(source: string, candidate: string): number {
    if (source === candidate) {
      return 1;
    }
    if (!source || !candidate) {
      return 0;
    }

    const [shorter, longer] =
      source.length <= candidate.length
        ? [source, candidate]
        : [candidate, source];
    let previous = Array.from(
      { length: shorter.length + 1 },
      (_, index) => index,
    );

    for (let row = 1; row <= longer.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= shorter.length; column += 1) {
        const cost = longer[row - 1] === shorter[column - 1] ? 0 : 1;
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + cost,
        );
      }
      previous = current;
    }

    const distance = previous[shorter.length];
    return this.clamp(1 - distance / Math.max(source.length, candidate.length));
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
