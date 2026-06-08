import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload } from 'src/modules/auth/auth-token';
import { StringValue } from 'ms';

@Injectable()
export class JwtAuthService {
  private readonly _refreshSecret: string;
  private readonly _accessSecret: string;
  private readonly ACCESS_TOKEN_EXPIRATION_TIME: StringValue;
  private readonly REFRESH_TOKEN_EXPIRATION_TIME: StringValue;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this._refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this._accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.ACCESS_TOKEN_EXPIRATION_TIME = this.configService.get<StringValue>(
      'ACCESS_TOKEN_EXPIRATION_TIME',
      '15m',
    );
    this.REFRESH_TOKEN_EXPIRATION_TIME = this.configService.get<StringValue>(
      'REFRESH_TOKEN_EXPIRATION_TIME',
      '14d',
    );
  }

  public async getTokenPair(
    payload: AuthTokenPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this._accessSecret,
      expiresIn: this.ACCESS_TOKEN_EXPIRATION_TIME,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this._refreshSecret,
      expiresIn: this.REFRESH_TOKEN_EXPIRATION_TIME,
    });
    return { accessToken, refreshToken };
  }

  public async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: this._accessSecret,
    });
  }

  public async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    return await this.jwtService.verifyAsync(token, {
      secret: this._refreshSecret,
    });
  }
}
