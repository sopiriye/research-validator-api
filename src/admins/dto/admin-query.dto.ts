import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AdminRole, AdminStatus } from '@prisma/client';
import { trimInput, uppercaseInput } from '../../common/utils/transform.utils';

export class AdminQueryDto {
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
  @Max(200)
  search?: string;

  @Transform(({ value }) => uppercaseInput(value))
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @Transform(({ value }) => uppercaseInput(value))
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
