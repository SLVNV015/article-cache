import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/modules/users/user.schema';
import { LoginDto, RegisterDto } from 'src/modules/auth/auth.schema';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  CurrentUser,
  ICurrentUser,
} from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

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

    return pair.accessToken;
  }

  @ApiBearerAuth()
  @Get('me')
  public async getMe(@CurrentUser() user: ICurrentUser) {
    return this.authService.getUser(user.userId);
  }
}
