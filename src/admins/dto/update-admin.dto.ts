import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdminRole } from '@prisma/client';
import {
  normalizeEmailInput,
  normalizeWhitespaceInput,
  uppercaseInput,
} from '../../common/utils/transform.utils';

export class UpdateAdminDto {
  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName?: string;

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @Transform(({ value }) => uppercaseInput(value))
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
