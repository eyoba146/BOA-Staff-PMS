export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor({ status, code, message, fieldErrors }: ApiErrorShape) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', fieldErrors?: Record<string, string>) {
    return new ApiError({ status: 400, code, message, fieldErrors });
  }

  static unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED') {
    return new ApiError({ status: 401, code, message });
  }

  static forbidden(message = 'Access forbidden.', code = 'FORBIDDEN') {
    return new ApiError({ status: 403, code, message });
  }

  static notFound(message = 'Resource not found.', code = 'NOT_FOUND') {
    return new ApiError({ status: 404, code, message });
  }

  static conflict(message: string, code = 'CONFLICT', fieldErrors?: Record<string, string>) {
    return new ApiError({ status: 409, code, message, fieldErrors });
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.', code = 'RATE_LIMIT') {
    return new ApiError({ status: 429, code, message });
  }

  static internal(message = 'An unexpected server error occurred.', code = 'INTERNAL_ERROR') {
    return new ApiError({ status: 500, code, message });
  }
}
