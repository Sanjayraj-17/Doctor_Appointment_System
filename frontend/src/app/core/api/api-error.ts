import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Unable to reach the server at http://localhost:5122. Make sure the backend API is running.';
  }

  const extracted = extractBodyError(error.error);
  if (extracted) {
    return extracted;
  }

  if (error.status === 401) {
    return 'Invalid credentials or your session has expired. Please sign in again.';
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.status >= 500) {
    return 'A server error occurred while processing your request. Please try again.';
  }

  return fallback;
}

function extractBodyError(body: unknown): string {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (!isRecord(body)) {
    return '';
  }

  const errors = body['errors'];
  const validationErrors = Array.isArray(errors)
    ? errors.filter(isString).join(' ')
    : isRecord(errors)
      ? Object.values(errors)
          .flatMap((value) => (Array.isArray(value) ? value.filter(isString) : []))
          .join(' ')
      : '';

  if (validationErrors) {
    return validationErrors;
  }

  const message = body['message'];
  if (isString(message) && message.trim()) {
    return message.trim();
  }

  const title = body['title'];
  if (isString(title) && title.trim()) {
    return title.trim();
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
