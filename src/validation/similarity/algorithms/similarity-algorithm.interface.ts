export interface SimilarityAlgorithm {
  calculate(source: string, candidate: string): number;
}
