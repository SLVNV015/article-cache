import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';

/**
 * @description Завершение соединения с редисом, а так же ловля ошибок что бы не упасть
 */
@Injectable()
export class RedisShutdownService
  implements OnApplicationShutdown, OnModuleDestroy, OnModuleInit
{
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectPinoLogger(RedisShutdownService.name)
    private readonly logger: PinoLogger,
  ) {}

  public onModuleInit() {
    this.redis.on('error', (err) => {
      this.logger.error(err);
    });
  }

  public onModuleDestroy(): void {
    this.redis.disconnect();
  }
  public async onApplicationShutdown(signal?: string): Promise<void> {
    await this.redis.quit();
  }
}
