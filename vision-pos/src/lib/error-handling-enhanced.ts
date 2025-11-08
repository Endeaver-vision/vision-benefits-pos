import { NextResponse } from 'next/server';

// Enhanced error types for better debugging
export interface ApplicationError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Database errors
  DATABASE_CONNECTION: 'DB_CONNECTION_ERROR',
  DATABASE_QUERY: 'DB_QUERY_ERROR', 
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT: 'INVALID_INPUT_FORMAT',
  
  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED'
} as const;

// Enhanced error logger with structured logging
export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: ApplicationError[] = [];
  
  static getInstance(): ErrorLogger {
    if (!this.instance) {
      this.instance = new ErrorLogger();
    }
    return this.instance;
  }
  
  // Log error with enhanced context
  log(error: Error | string, context?: Record<string, unknown>): ApplicationError {
    const appError: ApplicationError = {
      code: this.categorizeError(error),
      message: typeof error === 'string' ? error : error.message,
      details: typeof error === 'object' ? error : undefined,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date(),
      context
    };
    
    // Store error for debugging
    this.errors.push(appError);
    
    // Enhanced console logging with color coding
    this.logToConsole(appError);
    
    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.logToExternalService(appError);
    }
    
    return appError;
  }
  
  private categorizeError(error: Error | string): string {
    if (typeof error === 'string') {
      return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
    
    // Categorize based on error message patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('prisma') || message.includes('database')) {
      return ERROR_CODES.DATABASE_QUERY;
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ERROR_CODES.UNAUTHORIZED;
    }
    if (message.includes('validation') || message.includes('required')) {
      return ERROR_CODES.VALIDATION_ERROR;
    }
    if (message.includes('not found')) {
      return ERROR_CODES.RECORD_NOT_FOUND;
    }
    if (message.includes('duplicate') || message.includes('unique constraint')) {
      return ERROR_CODES.DUPLICATE_RECORD;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_CODES.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ERROR_CODES.TIMEOUT_ERROR;
    }
    
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
  
  private logToConsole(error: ApplicationError): void {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      console.group(`🚨 ${error.code} - ${error.message}`);
      console.error('📅 Timestamp:', error.timestamp.toISOString());
      console.error('🏷️ Error Code:', error.code);
      console.error('💬 Message:', error.message);
      
      if (error.context) {
        console.error('🔍 Context:', JSON.stringify(error.context, null, 2));
      }
      
      if (error.stack && isDev) {
        console.error('📚 Stack Trace:', error.stack);
      }
      
      if (error.details) {
        console.error('📋 Details:', error.details);
      }
      
      console.groupEnd();
    } else {
      // Production logging - less verbose
      console.error(`[${error.timestamp.toISOString()}] ${error.code}: ${error.message}`, {
        context: error.context,
        details: typeof error.details === 'object' ? 'Object' : error.details
      });
    }
  }
  
  private logToExternalService(error: ApplicationError): void {
    // Implement external logging service integration
    // Examples: Sentry, DataDog, CloudWatch, etc.
    if (process.env.SENTRY_DSN) {
      // Sentry integration would go here
      console.log('External logging service integration:', { error });
    }
  }
  
  // Get error statistics for monitoring
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: ApplicationError[];
  } {
    const errorsByCode: Record<string, number> = {};
    
    this.errors.forEach(error => {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });
    
    return {
      totalErrors: this.errors.length,
      errorsByCode,
      recentErrors: this.errors.slice(-10) // Last 10 errors
    };
  }
  
  // Clear error log (useful for testing)
  clear(): void {
    this.errors = [];
  }
}

// Enhanced API error response helper
export function createErrorResponse(
  error: Error | string,
  statusCode: number = 500,
  context?: Record<string, unknown>
): NextResponse {
  const logger = ErrorLogger.getInstance();
  const appError = logger.log(error, context);
  
  // Don't expose sensitive error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  return NextResponse.json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      timestamp: appError.timestamp,
      ...(isDev && {
        stack: appError.stack,
        details: appError.details,
        context: appError.context
      })
    }
  }, { status: statusCode });
}

// API route wrapper with automatic error handling
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Unhandled error in API route:', error);
      return createErrorResponse(
        error instanceof Error ? error : 'Unknown error occurred',
        500,
        {
          handler: handler.name,
          args: args.length
        }
      );
    }
  };
}

// Database operation wrapper with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Validation helper with better error messages
export class ValidationError extends Error {
  constructor(
    public field: string,
    public expectedType: string,
    public receivedValue: unknown
  ) {
    super(`Validation failed for field '${field}': expected ${expectedType}, received ${typeof receivedValue} (${receivedValue})`);
    this.name = 'ValidationError';
  }
}

export function validateRequired<T>(
  value: T,
  fieldName: string
): NonNullable<T> {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(fieldName, 'non-empty value', value);
  }
  return value as NonNullable<T>;
}

export function validateType<T>(
  value: unknown,
  expectedType: string,
  fieldName: string
): T {
  if (typeof value !== expectedType) {
    throw new ValidationError(fieldName, expectedType, value);
  }
  return value as T;
}

export function validateEmail(email: string, fieldName: string = 'email'): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(fieldName, 'valid email address', email);
  }
  return email;
}

export function validatePhone(phone: string, fieldName: string = 'phone'): string {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError(fieldName, 'valid phone number', phone);
  }
  return phone;
}

// Performance monitoring for critical operations
export class PerformanceTracker {
  private static measurements: Map<string, number[]> = new Map();
  
  static start(operationName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(operationName)) {
        this.measurements.set(operationName, []);
      }
      
      this.measurements.get(operationName)!.push(duration);
      
      // Log slow operations
      if (duration > 1000) { // More than 1 second
        console.warn(`⚠️ Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  static getStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.measurements.forEach((times, operation) => {
      stats[operation] = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      };
    });
    
    return stats;
  }
}

// Memory usage monitoring
export function logMemoryUsage(context: string): void {
  if (process.env.NODE_ENV === 'development') {
    const used = process.memoryUsage();
    console.log(`💾 Memory usage [${context}]:`, {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
    });
  }
}