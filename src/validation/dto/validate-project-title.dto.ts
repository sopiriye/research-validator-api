import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimInput } from '../../common/utils/transform.utils';

export class ValidateProjectTitleDto {
  @Transform(({ value }) => trimInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000)
  projectTitle!: string;
}
