export type SimilarityClassification =
  'HIGH_SIMILARITY' | 'REVIEW' | 'WEAK_MATCH' | 'NO_MATCH';

export interface AlgorithmScores {
  levenshtein: number;
  trigram: number;
  tokenSimilarity: number;
}

export interface SimilarityResult {
  algorithmScores: AlgorithmScores;
  deterministicScore: number;
  classification: SimilarityClassification;
}
