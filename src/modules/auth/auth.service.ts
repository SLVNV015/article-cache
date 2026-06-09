import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthSessionService } from 'src/modules/auth/auth-session.service';
import { LoginDto } from 'src/modules/auth/auth.schema';
import { JwtAuthService } from 'src/modules/auth/jwt-auth.service';
import { CreateUserDto, UserResponseDto } from 'src/modules/users/user.schema';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  public async register(dto: CreateUserDto): Promise<{ sucess: boolean }> {
    await this.usersService.createUser(dto);
    return { sucess: true };
  }
  public async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.getUserByEmailAndVerifyPassword(
      dto.email,
      dto.password,
    );
    const sessionId = randomUUID();

    const tokenPair = await this.jwtAuthService.getTokenPair({
      userId: user.id,
      email: user.email,
      sessionId,
    });

    await this.authSessionService.createSession(
      user.id,
      sessionId,
      tokenPair.refreshToken,
    );
    return tokenPair;
  }

  public async logout(userId: string, sessionId: string): Promise<void> {
    await this.authSessionService.deleteSession(userId, sessionId);
  }

  public async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.jwtAuthService.verifyRefreshToken(refreshToken);
    const isValid = await this.authSessionService.validateREfreshTOken(
      payload.userId,
      payload.sessionId,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const newTokenPair = await this.jwtAuthService.getTokenPair({
      userId: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
    });
    await this.authSessionService.deleteSession(
      payload.userId,
      payload.sessionId,
    );
    await this.authSessionService.createSession(
      payload.userId,
      payload.sessionId,
      newTokenPair.refreshToken,
    );
    return newTokenPair;
  }
  public async getUser(userId: string): Promise<UserResponseDto> {
    return await this.usersService.getUserById(userId);
  }
}
