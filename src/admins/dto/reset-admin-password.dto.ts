import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResetAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newPassword!: string;
}
