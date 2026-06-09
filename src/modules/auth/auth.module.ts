import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSessionService } from 'src/modules/auth/auth-session.service';
import { JwtAuthService } from 'src/modules/auth/jwt-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/modules/users/users.module';
import { AuthController } from 'src/modules/auth/auth.controller';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthSessionService, JwtAuthService],
  exports: [JwtAuthService],
})
export class AuthModule {}
