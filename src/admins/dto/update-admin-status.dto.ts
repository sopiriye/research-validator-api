import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';
import { AdminStatus } from '@prisma/client';
import { uppercaseInput } from '../../common/utils/transform.utils';

export class UpdateAdminStatusDto {
  @Transform(({ value }) => uppercaseInput(value))
  @IsIn([AdminStatus.ACTIVE, AdminStatus.DISABLED])
  status!: AdminStatus;
}
