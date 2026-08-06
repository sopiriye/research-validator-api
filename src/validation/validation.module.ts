import { Module } from '@nestjs/common';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { ExactMatchService } from './exact-match/exact-match.service';
import { NormalizationModule } from './normalization/normalization.module';
import { CandidateRetrievalService } from './similarity/candidate-retrieval.service';
import { LevenshteinSimilarityService } from './similarity/algorithms/levenshtein-similarity.service';
import { TokenSimilarityService } from './similarity/algorithms/token-similarity.service';
import { TrigramSimilarityService } from './similarity/algorithms/trigram-similarity.service';
import { ScoreAggregatorService } from './similarity/score-aggregator.service';
import { SimilarityEngineService } from './similarity/similarity-engine.service';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';

@Module({
  imports: [DepartmentsModule, NormalizationModule, ProjectsModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    ExactMatchService,
    CandidateRetrievalService,
    SimilarityEngineService,
    ScoreAggregatorService,
    LevenshteinSimilarityService,
    TrigramSimilarityService,
    TokenSimilarityService,
  ],
  exports: [NormalizationModule],
})
export class ValidationModule {}
