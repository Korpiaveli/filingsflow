export enum FilingErrorType {
  SEC_API_ERROR = 'SEC_API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENTITY_MISMATCH = 'ENTITY_MISMATCH',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface FilingErrorDetails {
  type: FilingErrorType
  message: string
  statusCode?: number
  retryable: boolean
  context?: string
  originalError?: Error
}

export class FilingError extends Error {
  public readonly type: FilingErrorType
  public readonly statusCode?: number
  public readonly retryable: boolean
  public readonly context?: string
  public readonly originalError?: Error

  constructor(details: FilingErrorDetails) {
    super(details.message)
    this.name = 'FilingError'
    this.type = details.type
    this.statusCode = details.statusCode
    this.retryable = details.retryable
    this.context = details.context
    this.originalError = details.originalError
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    }
  }
}

export class FilingErrorHandler {
  static handleError(error: unknown, context: string): FilingError {
    if (error instanceof FilingError) {
      return error
    }

    if (error instanceof Error) {
      return this.categorizeError(error, context)
    }

    return new FilingError({
      type: FilingErrorType.UNKNOWN_ERROR,
      message: String(error) || 'An unknown error occurred',
      retryable: false,
      context,
    })
  }

  private static categorizeError(error: Error, context: string): FilingError {
    const msg = error.message.toLowerCase()

    if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('econnreset')) {
      return new FilingError({
        type: FilingErrorType.NETWORK_ERROR,
        message: error.message,
        retryable: true,
        context,
        originalError: error,
      })
    }

    if (msg.includes('timeout') || msg.includes('etimedout')) {
      return new FilingError({
        type: FilingErrorType.TIMEOUT_ERROR,
        message: error.message,
        retryable: true,
        context,
        originalError: error,
      })
    }

    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
      return new FilingError({
        type: FilingErrorType.RATE_LIMIT_ERROR,
        message: error.message,
        retryable: true,
        context,
        originalError: error,
      })
    }

    if (msg.includes('sec.gov') || msg.includes('edgar')) {
      return new FilingError({
        type: FilingErrorType.SEC_API_ERROR,
        message: error.message,
        retryable: true,
        context,
        originalError: error,
      })
    }

    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
      return new FilingError({
        type: FilingErrorType.VALIDATION_ERROR,
        message: error.message,
        retryable: false,
        context,
        originalError: error,
      })
    }

    if (msg.includes('supabase') || msg.includes('database') || msg.includes('postgres')) {
      return new FilingError({
        type: FilingErrorType.DATABASE_ERROR,
        message: error.message,
        retryable: msg.includes('connection'),
        context,
        originalError: error,
      })
    }

    return new FilingError({
      type: FilingErrorType.UNKNOWN_ERROR,
      message: error.message,
      retryable: false,
      context,
      originalError: error,
    })
  }

  static handleSECApiError(statusCode: number, message: string, context: string): FilingError {
    let type: FilingErrorType
    let retryable = false

    switch (statusCode) {
      case 429:
        type = FilingErrorType.RATE_LIMIT_ERROR
        retryable = true
        break
      case 408:
      case 504:
        type = FilingErrorType.TIMEOUT_ERROR
        retryable = true
        break
      case 500:
      case 502:
      case 503:
        type = FilingErrorType.SEC_API_ERROR
        retryable = true
        break
      default:
        type = FilingErrorType.SEC_API_ERROR
        retryable = statusCode >= 500
    }

    return new FilingError({
      type,
      message: `SEC API Error (${statusCode}): ${message}`,
      statusCode,
      retryable,
      context,
    })
  }

  static createUserMessage(error: FilingError): string {
    switch (error.type) {
      case FilingErrorType.RATE_LIMIT_ERROR:
        return 'SEC API rate limit exceeded. Please try again later.'
      case FilingErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.'
      case FilingErrorType.NETWORK_ERROR:
        return 'Network error. Please check your connection.'
      case FilingErrorType.SEC_API_ERROR:
        return error.retryable
          ? 'SEC EDGAR is temporarily unavailable. Please try again.'
          : `SEC API error: ${error.message}`
      case FilingErrorType.VALIDATION_ERROR:
        return `Invalid input: ${error.message}`
      case FilingErrorType.ENTITY_MISMATCH:
        return `Entity validation failed: ${error.message}`
      case FilingErrorType.DATABASE_ERROR:
        return 'Database error occurred. Please try again.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  static shouldRetry(error: FilingError, attemptCount: number, maxRetries = 3): boolean {
    return attemptCount < maxRetries && error.retryable
  }

  static getRetryDelay(attemptCount: number, baseDelay = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attemptCount), 30000)
  }
}

export function createEntityMismatchError(
  insiderName: string,
  expectedCompany: string,
  actualCompany: string,
  context?: string
): FilingError {
  return new FilingError({
    type: FilingErrorType.ENTITY_MISMATCH,
    message: `Insider "${insiderName}" title is for "${actualCompany}", not "${expectedCompany}"`,
    retryable: false,
    context,
  })
}
