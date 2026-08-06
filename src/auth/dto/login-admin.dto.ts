import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmailInput } from '../../common/utils/transform.utils';

export class LoginAdminDto {
  @Transform(({ value }) => normalizeEmailInput(value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
