import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthService } from './jwt-auth.service';
import { AuthSessionService } from './auth-session.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtAuthService: JwtAuthService;
  let authSessionService: AuthSessionService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Тест Тестов',
    createdAt: new Date(),
  };

  const mockTokenPair = {
    accessToken: 'access-token-xyz',
    refreshToken: 'refresh-token-xyz',
  };

  const mockUsersService = {
    createUser: jest.fn(),
    getUserByEmailAndVerifyPassword: jest.fn(),
    getUserById: jest.fn(),
  };

  const mockJwtAuthService = {
    getTokenPair: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mockAuthSessionService = {
    createSession: jest.fn(),
    deleteSession: jest.fn(),
    validateREfreshTOken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: AuthSessionService,
          useValue: mockAuthSessionService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
    authSessionService = module.get<AuthSessionService>(AuthSessionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'Новый Пользователь',
    };

    it('должен зарегистрировать нового пользователя', async () => {
      mockUsersService.createUser.mockResolvedValue(mockUser);

      const result = await service.register(createUserDto);

      expect(result).toEqual({ sucess: true });
      expect(usersService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('должен пробросить ошибку из UsersService', async () => {
      mockUsersService.createUser.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(service.register(createUserDto)).rejects.toThrow(
        'Email already exists',
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('должен выполнить вход и вернуть токены', async () => {
      mockUsersService.getUserByEmailAndVerifyPassword.mockResolvedValue(
        mockUser,
      );
      mockJwtAuthService.getTokenPair.mockResolvedValue(mockTokenPair);
      mockAuthSessionService.createSession.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toEqual(mockTokenPair);
      expect(usersService.getUserByEmailAndVerifyPassword).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(jwtAuthService.getTokenPair).toHaveBeenCalled();
      expect(authSessionService.createSession).toHaveBeenCalled();
    });

    it('должен создать сессию с корректными данными', async () => {
      mockUsersService.getUserByEmailAndVerifyPassword.mockResolvedValue(
        mockUser,
      );
      mockJwtAuthService.getTokenPair.mockResolvedValue(mockTokenPair);
      mockAuthSessionService.createSession.mockResolvedValue(undefined);

      await service.login(loginDto);

      const sessionCall = mockAuthSessionService.createSession.mock.calls[0];
      expect(sessionCall[0]).toBe(mockUser.id);
      expect(sessionCall[1]).toBeDefined(); // sessionId (UUID)
      expect(sessionCall[2]).toBe(mockTokenPair.refreshToken);
    });

    it('должен пробросить UnauthorizedException при неправильных credentials', async () => {
      mockUsersService.getUserByEmailAndVerifyPassword.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';

    it('должен удалить сессию при выходе', async () => {
      mockAuthSessionService.deleteSession.mockResolvedValue(undefined);

      await service.logout(userId, sessionId);

      expect(authSessionService.deleteSession).toHaveBeenCalledWith(
        userId,
        sessionId,
      );
    });
  });

  describe('refresh', () => {
    const refreshToken = 'old-refresh-token';
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      sessionId: 'session-456',
    };

    it('должен обновить токены при валидном refresh token', async () => {
      mockJwtAuthService.verifyRefreshToken.mockResolvedValue(payload);
      mockAuthSessionService.validateREfreshTOken.mockResolvedValue(true);
      mockJwtAuthService.getTokenPair.mockResolvedValue(mockTokenPair);
      mockAuthSessionService.deleteSession.mockResolvedValue(undefined);
      mockAuthSessionService.createSession.mockResolvedValue(undefined);

      const result = await service.refresh(refreshToken);

      expect(result).toEqual(mockTokenPair);
      expect(jwtAuthService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(authSessionService.validateREfreshTOken).toHaveBeenCalledWith(
        payload.userId,
        payload.sessionId,
        refreshToken,
      );
    });

    it('должен выбросить UnauthorizedException при невалидном refresh token', async () => {
      mockJwtAuthService.verifyRefreshToken.mockResolvedValue(payload);
      mockAuthSessionService.validateREfreshTOken.mockResolvedValue(false);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('должен удалить старую сессию и создать новую', async () => {
      mockJwtAuthService.verifyRefreshToken.mockResolvedValue(payload);
      mockAuthSessionService.validateREfreshTOken.mockResolvedValue(true);
      mockJwtAuthService.getTokenPair.mockResolvedValue(mockTokenPair);
      mockAuthSessionService.deleteSession.mockResolvedValue(undefined);
      mockAuthSessionService.createSession.mockResolvedValue(undefined);

      await service.refresh(refreshToken);

      expect(authSessionService.deleteSession).toHaveBeenCalledWith(
        payload.userId,
        payload.sessionId,
      );
      expect(authSessionService.createSession).toHaveBeenCalledWith(
        payload.userId,
        payload.sessionId,
        mockTokenPair.refreshToken,
      );
    });
  });

  describe('getUser', () => {
    const userId = 'user-123';

    it('должен вернуть данные пользователя', async () => {
      mockUsersService.getUserById.mockResolvedValue(mockUser);

      const result = await service.getUser(userId);

      expect(result).toEqual(mockUser);
      expect(usersService.getUserById).toHaveBeenCalledWith(userId);
    });

    it('должен пробросить ошибку если пользователь не найден', async () => {
      mockUsersService.getUserById.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(service.getUser(userId)).rejects.toThrow('User not found');
    });
  });
});
