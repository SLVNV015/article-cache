import { Test, TestingModule } from '@nestjs/testing';
import { AuthSessionService } from './auth-session.service';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';
import * as argon2 from 'argon2';

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let redis: any;

  const mockRedis = {
    multi: jest.fn(),
    get: jest.fn(),
    smembers: jest.fn(),
    pipeline: jest.fn(),
  };

  const mockMulti = {
    set: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    del: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
  };

  const mockPipeline = {
    del: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    mockRedis.multi.mockReturnValue(mockMulti);
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AuthSessionService>(AuthSessionService);
    redis = module.get(REDIS_CLIENT);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';
    const refreshToken = 'refresh-token-xyz';

    it('должен создать сессию с хешированным токеном', async () => {
      mockMulti.exec.mockResolvedValue([[null, 'OK'], [null, 1]]);

      await service.createSession(userId, sessionId, refreshToken);

      expect(redis.multi).toHaveBeenCalled();
      expect(mockMulti.set).toHaveBeenCalled();
      expect(mockMulti.sadd).toHaveBeenCalledWith(
        `auth:session:${userId}`,
        sessionId,
      );
      expect(mockMulti.exec).toHaveBeenCalled();

      const setCall = mockMulti.set.mock.calls[0];
      expect(setCall[0]).toBe(`auth:refresh:${userId}:${sessionId}`);
      expect(setCall[2]).toBe('EX');
      expect(setCall[3]).toBe(60 * 60 * 24 * 14); // 14 дней
    });

    it('должен хешировать refresh token перед сохранением', async () => {
      mockMulti.exec.mockResolvedValue([[null, 'OK'], [null, 1]]);

      await service.createSession(userId, sessionId, refreshToken);

      const setCall = mockMulti.set.mock.calls[0];
      const storedData = JSON.parse(setCall[1]);

      expect(storedData.hash).toBeDefined();
      expect(storedData.hash).not.toBe(refreshToken);
      expect(storedData.createdAt).toBeDefined();

      const isValid = await argon2.verify(storedData.hash, refreshToken);
      expect(isValid).toBe(true);
    });
  });

  describe('validateREfreshTOken', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';
    const refreshToken = 'refresh-token-xyz';

    it('должен вернуть true для валидного токена', async () => {
      const hash = await argon2.hash(refreshToken);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          hash,
          createdAt: Date.now(),
        }),
      );

      const result = await service.validateREfreshTOken(
        userId,
        sessionId,
        refreshToken,
      );

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith(
        `auth:refresh:${userId}:${sessionId}`,
      );
    });

    it('должен вернуть false если сессия не найдена', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validateREfreshTOken(
        userId,
        sessionId,
        refreshToken,
      );

      expect(result).toBe(false);
    });

    it('должен вернуть false для неправильного токена', async () => {
      const hash = await argon2.hash('different-token');
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          hash,
          createdAt: Date.now(),
        }),
      );

      const result = await service.validateREfreshTOken(
        userId,
        sessionId,
        refreshToken,
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';

    it('должен удалить сессию из Redis', async () => {
      mockMulti.exec.mockResolvedValue([[null, 1], [null, 1]]);

      await service.deleteSession(userId, sessionId);

      expect(redis.multi).toHaveBeenCalled();
      expect(mockMulti.del).toHaveBeenCalledWith(
        `auth:refresh:${userId}:${sessionId}`,
      );
      expect(mockMulti.srem).toHaveBeenCalledWith(
        `auth:session:${userId}`,
        sessionId,
      );
      expect(mockMulti.exec).toHaveBeenCalled();
    });
  });

  describe('deleteAllSessions', () => {
    const userId = 'user-123';

    it('должен удалить все сессии пользователя', async () => {
      const sessions = ['session-1', 'session-2', 'session-3'];
      mockRedis.smembers.mockResolvedValue(sessions);
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
        [null, 3],
      ]);

      await service.deleteAllSessions(userId);

      expect(redis.smembers).toHaveBeenCalledWith(`auth:session:${userId}`);
      expect(redis.pipeline).toHaveBeenCalled();

      sessions.forEach((session) => {
        expect(mockPipeline.del).toHaveBeenCalledWith(
          `auth:refresh:${userId}:${session}`,
        );
      });

      expect(mockPipeline.srem).toHaveBeenCalledWith(
        `auth:session:${userId}`,
        ...sessions,
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('должен ничего не делать если нет активных сессий', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      await service.deleteAllSessions(userId);

      expect(redis.smembers).toHaveBeenCalledWith(`auth:session:${userId}`);
      expect(redis.pipeline).not.toHaveBeenCalled();
    });
  });
});
