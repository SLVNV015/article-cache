import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisShutdownService } from 'src/common/redis/redis-shutdown.service';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';

@Module({})
@Global()
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENT,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            return new Redis({
              host: config.getOrThrow<string>('REDIS_HOST'),
              port: config.getOrThrow<number>('REDIS_PORT'),
              password: config.getOrThrow<string>('REDIS_PASSWORD'),
              db: config.get<number>('REDIS_DB', 0),
              maxRetriesPerRequest: null,
              enableReadyCheck: true,
              reconnectOnError: (err) => {
                const tartgetError = 'READONLY';
                if (err.message === tartgetError) {
                  //Переподключение если редис в режиме readonlyол
                  return true;
                }
                return false;
              },
              retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
              },
            });
          },
        },
        RedisShutdownService,
      ],
      exports: [REDIS_CLIENT],
    };
  }
}
