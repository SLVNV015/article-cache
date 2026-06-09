import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';
import * as argon2 from 'argon2';

@Injectable()
export class AuthSessionService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async createSession(
    userId: string,
    sessionId: string,
    refreshToken: string,
  ) {
    const key = `auth:refresh:${userId}:${sessionId}`;
    const hash = await this.hashToken(refreshToken);
    await this.redis
      .multi()
      .set(
        key,
        JSON.stringify({
          hash,
          createdAt: Date.now(),
        }),
        'EX',
        60 * 60 * 24 * 14,
      )
      .sadd(`auth:session:${userId}`, sessionId)
      .exec();
  }

  public async validateREfreshTOken(
    userId: string,
    sessionId: string,
    resfreshToken: string,
  ): Promise<boolean> {
    const key = `auth:refresh:${userId}:${sessionId}`;
    const session = await this.redis.get(key);
    if (!session) {
      return false;
    }
    const { hash } = JSON.parse(session);
    const isValid = await this.verifyToken(resfreshToken, hash);
    if (!isValid) {
      return false;
    }
    return true;
  }

  public async deleteSession(userId: string, sessionId: string): Promise<void> {
    const key = `auth:refresh:${userId}:${sessionId}`;
    await this.redis
      .multi()
      .del(key)
      .srem(`auth:session:${userId}`, sessionId)
      .exec();
  }

  public async deleteAllSessions(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`auth:session:${userId}`);
    if (sessions.length === 0) {
      return;
    }
    const pipeline = this.redis.pipeline();
    for (const session of sessions) {
      pipeline.del(`auth:refresh:${userId}:${session}`);
    }
    pipeline.srem(`auth:session:${userId}`, ...sessions);
    await pipeline.exec();
  }

  private async hashToken(token: string): Promise<string> {
    return await argon2.hash(token);
  }

  private async verifyToken(token: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, token);
  }
}
