import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  CurrentUser,
  ICurrentUser,
} from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SucessResponseDto } from 'src/common/utils/base-sucess.response';
import { AccessTokenDto, LoginDto } from 'src/modules/auth/auth.schema';
import { AuthService } from 'src/modules/auth/auth.service';
import { CreateUserDto, UserResponseDto } from 'src/modules/users/user.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @ApiOkResponse({ type: SucessResponseDto })
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @ApiOkResponse({ type: AccessTokenDto })
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pair = await this.authService.login(dto);

    res.cookie('refreshToken', pair.refreshToken, {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? true
          : false,
      // чисто для dev
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 14,
    });

    return { accessToken: pair.accessToken };
  }

  @ApiOkResponse({ type: UserResponseDto })
  @ApiBearerAuth()
  @Get('me')
  public async getMe(@CurrentUser() user: ICurrentUser) {
    return this.authService.getUser(user.userId);
  }

  @ApiOkResponse({ type: AccessTokenDto })
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies.refreshToken;
    console.log('refreshToken', refreshToken);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? true
          : false,
      // чисто для dev
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 14,
    });
    return { accessToken };
  }

  @ApiOkResponse({ type: SucessResponseDto })
  @Post('logout')
  public async logout(@CurrentUser() user: ICurrentUser) {
    await this.authService.logout(user.userId, user.sessionId);
    return { sucess: true };
  }
}
