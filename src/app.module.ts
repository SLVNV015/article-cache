import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { RedisModule } from 'src/common/redis/redis.module';
import { ShutdownModule } from 'src/common/shutdown/shutdown.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        synchronize: false,
        url: config.getOrThrow<string>('DATABASE_URL'),
        migrationsRun: config.get('MIGRATIONS_RUN') === 'true' ? true : false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        isGlobal: true,
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            config.get('NODE_ENV') === 'production'
              ? undefined
              : { target: 'pino-pretty' },
          autoLogging: {
            ignore: (req: Request) => {
              const url = req.url || req.originalUrl;
              return (
                url.includes('/docs') ||
                url.includes('/healthz') ||
                url.includes('/metrics')
              );
            },
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers.set-cookie',
              'req.body.password',
              'req.body.confirmPassword',
              'req.body.secret',
            ],
            censor: '***',
          },
        },
      }),
    }),
    ShutdownModule,
    RedisModule.forRoot(),
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [GlobalExceptionFilter],
})
export class AppModule {}
