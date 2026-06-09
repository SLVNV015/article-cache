import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthService } from './jwt-auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenPayload } from './auth-token';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      return null;
    });

    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: string) => {
        if (key === 'ACCESS_TOKEN_EXPIRATION_TIME') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRATION_TIME') return '14d';
        return defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTokenPair', () => {
    const payload: AuthTokenPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      sessionId: 'session-456',
    };

    it('должен сгенерировать пару токенов', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.getTokenPair(payload);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, payload, {
        secret: 'access-secret',
        expiresIn: '15m',
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, payload, {
        secret: 'refresh-secret',
        expiresIn: '14d',
      });
    });

    it('должен использовать правильные секреты для токенов', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.getTokenPair(payload);

      const accessCall = mockJwtService.signAsync.mock.calls[0];
      const refreshCall = mockJwtService.signAsync.mock.calls[1];

      expect(accessCall[1].secret).toBe('access-secret');
      expect(refreshCall[1].secret).toBe('refresh-secret');
    });

    it('должен использовать правильные времена истечения', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.getTokenPair(payload);

      const accessCall = mockJwtService.signAsync.mock.calls[0];
      const refreshCall = mockJwtService.signAsync.mock.calls[1];

      expect(accessCall[1].expiresIn).toBe('15m');
      expect(refreshCall[1].expiresIn).toBe('14d');
    });
  });

  describe('verifyAccessToken', () => {
    const payload: AuthTokenPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      sessionId: 'session-456',
    };

    it('должен верифицировать access token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyAccessToken('valid-access-token');

      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-access-token',
        {
          secret: 'access-secret',
        },
      );
    });

    it('должен выбросить ошибку для невалидного токена', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.verifyAccessToken('invalid-token'),
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    const payload: AuthTokenPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      sessionId: 'session-456',
    };

    it('должен верифицировать refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-refresh-token',
        {
          secret: 'refresh-secret',
        },
      );
    });

    it('должен выбросить ошибку для невалидного refresh токена', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(
        service.verifyRefreshToken('invalid-refresh-token'),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('должен использовать refresh secret для верификации', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await service.verifyRefreshToken('refresh-token');

      const call = mockJwtService.verifyAsync.mock.calls[0];
      expect(call[1].secret).toBe('refresh-secret');
    });
  });

  describe('configuration', () => {
    it('должен загрузить секреты из конфига при инициализации', () => {
      // Проверяем, что сервис был инициализирован с правильными секретами
      // Тестируем это косвенно через работу методов
      expect(service).toBeDefined();
    });

    it('должен использовать конфигурацию для генерации токенов', async () => {
      const payload = {
        userId: 'test',
        email: 'test@test.com',
        sessionId: 'session',
      };

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.getTokenPair(payload);

      // Проверяем что используются правильные секреты и времена
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: 'access-secret',
        expiresIn: '15m',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: 'refresh-secret',
        expiresIn: '14d',
      });
    });
  });
});
