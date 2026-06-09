import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ZodError } from 'zod'; // Импортируем ZodError для проверки

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorDetails: any = 'Unhandled exception';

    // Проверяем, является ли ошибка валидацией Zod
    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      errorDetails = exception.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (exception?.constructor?.name === 'ZodValidationException') {
      status = HttpStatus.BAD_REQUEST;
      errorDetails =
        (exception as any).getZodError?.()?.errors ||
        (exception as any).message;
    } else if (exception instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      errorDetails = 'Token expired' + exception.message + exception.expiredAt;
    } else if (exception instanceof JsonWebTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      errorDetails = 'Token invalid' + exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorDetails =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exceptionResponse
          : exception.message;
    }
    // Любые другие базовые ошибки JS Error
    else if (exception instanceof Error) {
      errorDetails = exception.message;
    }

    // Логируем только критические ошибки 500+
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          path: request.url,
          method: request.method,
        },
        typeof errorDetails === 'string'
          ? errorDetails
          : 'Internal Server Error',
      );
    }

    const responseBody = {
      success: false,
      statusCode: status,
      error: errorDetails,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    response
      .header('Content-Type', 'application/json')
      .status(status)
      .send(JSON.stringify(responseBody, null, 2));
  }
}
