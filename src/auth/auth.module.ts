import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DepartmentsModule } from '../departments/departments.module';
import { getJwtSecret } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    DepartmentsModule,
    JwtModule.register({
      global: true,
      secret: getJwtSecret(),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
