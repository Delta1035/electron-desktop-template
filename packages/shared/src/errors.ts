export type AppErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'INTERNAL'
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}
