import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from 'nestjs-pino';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { GracefulShutdownService } from 'src/common/shutdown/graceful-shutdown.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = await app.resolve(PinoLogger);

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalPipes(new ZodValidationPipe());

  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Articles api')
    .addBearerAuth()
    .build();
  let document = SwaggerModule.createDocument(app, swaggerConfig, {
    autoTagControllers: true,
  });
  document = cleanupOpenApiDoc(document);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();
  const shutdown = app.get(GracefulShutdownService);

  process.on('uncaughtException', (error) => {
    shutdown.forceShutdown('Uncaught exception', error);
  });
  process.on('unhandledRejection', (error) => {
    shutdown.forceShutdown(
      'Unhandled rejection',
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  await app.listen(process.env.PORT ?? 3000);
  logger.info(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
