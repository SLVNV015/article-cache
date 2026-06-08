import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './AuthController';
import { AuthSessionService } from 'src/modules/auth/auth-session.service';
import { JwtAuthService } from 'src/modules/auth/jwt-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/modules/users/users.module';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    JwtAuthService,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
  ],
  exports: [JwtAuthService],
})
export class AuthModule {}
