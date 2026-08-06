import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdminRole } from '@prisma/client';
import {
  normalizeEmailInput,
  normalizeWhitespaceInput,
  uppercaseInput,
} from '../../common/utils/transform.utils';

export class CreateAdminDto {
  @Transform(({ value }) => normalizeWhitespaceInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @Transform(({ value }) => uppercaseInput(value))
  @IsEnum(AdminRole)
  role!: AdminRole;
}
