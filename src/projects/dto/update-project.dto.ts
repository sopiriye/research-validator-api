import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
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

export class UpdateProjectDto {
  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supervisee?: string;

  @Transform(({ value }) => trimInput(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000)
  projectName?: string;

  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supervisor?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(currentYear)
  yearOfCompletion?: number;

  @Transform(({ value }) => toProgrammeCode(value))
  @IsOptional()
  @IsEnum(ProgrammeCode)
  programme?: ProgrammeCode;

  @Transform(({ value }) => uppercaseInput(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9][A-Z0-9._/-]*$/, {
    message:
      'Reg Number may contain letters, numbers, dots, underscores, slashes, and hyphens only.',
  })
  regNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxAbstractWords(300)
  abstract?: string;
}
