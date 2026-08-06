import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProgrammeCode } from '@prisma/client';
import { toProgrammeCode } from '../../common/utils/programme.utils';
import {
  normalizeWhitespaceInput,
  trimInput,
  uppercaseInput,
} from '../../common/utils/transform.utils';
import { MaxAbstractWords } from '../validators/abstract-word-limit.validator';

const currentYear = new Date().getFullYear();

export class CreateProjectDto {
  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supervisee!: string;

  @Transform(({ value }) => trimInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000)
  projectName!: string;

  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supervisor!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(currentYear)
  yearOfCompletion!: number;

  @Transform(({ value }) => toProgrammeCode(value))
  @IsEnum(ProgrammeCode)
  programme!: ProgrammeCode;

  @Transform(({ value }) => uppercaseInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9][A-Z0-9._/-]*$/, {
    message:
      'Serial number may contain letters, numbers, dots, underscores, slashes, and hyphens only.',
  })
  serialNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxAbstractWords(300)
  abstract!: string;
}
