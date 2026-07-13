export interface ApiRequestErrorOptions {
  status?: number
  code?: string
}

export class ApiRequestError extends Error {
  status?: number
  code?: string

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = options.status
    this.code = options.code
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}
