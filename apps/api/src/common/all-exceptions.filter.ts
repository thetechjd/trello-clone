import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from '@trello-clone/shared';
import type { Response } from 'express';
import { AppError } from './app-error';

/** Maps every thrown error to the locked `{ error: { code, message } }` shape. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;

    const { code, message, status } = toApiError(exception, this.logger);
    const response = host.switchToHttp().getResponse<Response>();
    const body: ApiErrorBody = { error: { code, message } };
    response.status(status).json(body);
  }
}

export function toApiError(
  exception: unknown,
  logger?: Logger,
): { code: ErrorCode; message: string; status: number } {
  if (exception instanceof AppError) {
    return { code: exception.code, message: exception.message, status: exception.status };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return { code: ERROR_CODES.CONFLICT, message: 'Already exists', status: 409 };
    }
    if (exception.code === 'P2025') {
      return { code: ERROR_CODES.NOT_FOUND, message: 'Not found', status: 404 };
    }
    if (exception.code === 'P2003') {
      return { code: ERROR_CODES.VALIDATION_FAILED, message: 'Invalid reference', status: 422 };
    }
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const mapped = statusToCode(status);
    const payload = exception.getResponse() as any;
    const message =
      typeof payload === 'string' ? payload : (payload?.message ?? exception.message);
    return {
      code: mapped,
      message: Array.isArray(message) ? message.join(', ') : String(message),
      status,
    };
  }

  logger?.error(exception instanceof Error ? exception.stack : String(exception));
  return {
    code: ERROR_CODES.INTERNAL,
    message: 'Something went wrong. Try again.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  };
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHENTICATED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 413:
      return ERROR_CODES.UPLOAD_TOO_LARGE;
    case 422:
      return ERROR_CODES.VALIDATION_FAILED;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return ERROR_CODES.INTERNAL;
  }
}
