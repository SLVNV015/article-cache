import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';

@Injectable()
export class RedisShutdownService
  implements OnApplicationShutdown, OnModuleDestroy
{
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public onModuleDestroy(): void {
    this.redis.disconnect();
  }
  public async onApplicationShutdown(signal?: string): Promise<void> {
    await this.redis.quit();
  }
}
