import { ProgrammeCode } from '@prisma/client';

export function toProgrammeCode(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'MSC') {
    return ProgrammeCode.MSC;
  }

  if (normalized === 'PHD') {
    return ProgrammeCode.PHD;
  }

  if (normalized === 'PGD') {
    return ProgrammeCode.PGD;
  }

  return value;
}

export function toProgrammeLabel(code: ProgrammeCode): 'PGD' | 'MSc' | 'PhD' {
  switch (code) {
    case ProgrammeCode.MSC:
      return 'MSc';
    case ProgrammeCode.PHD:
      return 'PhD';
    default:
      return 'PGD';
  }
}
