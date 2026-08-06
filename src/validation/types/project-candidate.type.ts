import { ProgrammeCode } from '@prisma/client';

export interface ProjectCandidate {
  id: string;
  projectName: string;
  normalizedProjectName: string;
  yearOfCompletion: number;
  programmeCode: ProgrammeCode;
  abstract: string;
}
