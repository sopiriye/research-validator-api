import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  normalizeEmailInput,
  normalizeWhitespaceInput,
} from '../../common/utils/transform.utils';

export class RegisterSuperAdminDto {
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
}
