import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionDetails {
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const details: ExceptionDetails =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : {
            message:
              typeof exceptionResponse === 'string'
                ? exceptionResponse
                : undefined,
          };
    const message = Array.isArray(details.message)
      ? 'Request validation failed.'
      : (details.message ?? 'An unexpected error occurred.');

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors: Array.isArray(details.message) ? details.message : undefined,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
