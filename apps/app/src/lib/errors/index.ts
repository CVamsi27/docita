class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string = "API_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message, code, statusCode);
  }
}
