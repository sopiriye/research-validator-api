import { Injectable } from '@nestjs/common';

@Injectable()
export class TitleNormalizationService {
  normalize(title: string): string {
    return title
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u2018\u2019\u201B\u2032`´]/g, "'")
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .replace(/['-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
