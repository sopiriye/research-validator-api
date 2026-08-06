import { TitleNormalizationService } from './title-normalization.service';

describe('TitleNormalizationService', () => {
  const service = new TitleNormalizationService();

  it('normalizes case, spacing, punctuation, apostrophes, and hyphens', () => {
    expect(
      service.normalize("  Assessment of ICT-Usage in Students' Learning!  "),
    ).toBe('assessment of ict usage in students learning');
  });

  it('standardizes ampersands before exact matching', () => {
    expect(service.normalize('ICT & Education')).toBe('ict and education');
  });
});
