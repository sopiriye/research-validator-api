import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProgrammeCode } from '@prisma/client';
import { toProgrammeCode } from '../../common/utils/programme.utils';
import { trimInput, uppercaseInput } from '../../common/utils/transform.utils';

const currentYear = new Date().getFullYear();

export class ProjectQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(({ value }) => trimInput(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @Transform(({ value }) => toProgrammeCode(value))
  @IsOptional()
  @IsEnum(ProgrammeCode)
  programme?: ProgrammeCode;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(currentYear)
  yearOfCompletion?: number;

  @Transform(({ value }) => trimInput(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supervisor?: string;

  @Transform(({ value }) => uppercaseInput(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  regNumber?: string;
}
