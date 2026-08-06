import { Module } from '@nestjs/common';
import { TitleNormalizationService } from './title-normalization.service';

@Module({
  providers: [TitleNormalizationService],
  exports: [TitleNormalizationService],
})
export class NormalizationModule {}
