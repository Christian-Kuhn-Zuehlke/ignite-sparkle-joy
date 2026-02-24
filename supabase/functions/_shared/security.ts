// Shared security utilities for Edge Functions
// Enhanced with comprehensive CORS, Security Headers, and Rate Limiting

// Environment-based allowed origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://id-preview--szruenulmfdxzhvupprf.lovable.app',
  'https://szruenulmfdxzhvupprf.lovable.app',
];

// Security Headers for all responses
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Get CORS headers with proper origin validation
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Allow all Lovable preview domains including .lovableproject.com
  const isAllowedOrigin = requestOrigin && (
    ALLOWED_ORIGINS.includes(requestOrigin) || 
    requestOrigin.endsWith('.lovable.app') || 
    requestOrigin.endsWith('.lovable.dev') ||
    requestOrigin.endsWith('.lovableproject.com') ||
    requestOrigin.includes('localhost')
  );
  
  const origin = isAllowedOrigin ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    ...SECURITY_HEADERS,
  };
}

// Get all response headers (CORS + Security)
export function getResponseHeaders(requestOrigin: string | null, contentType = 'application/json'): Record<string, string> {
  return {
    ...getCorsHeaders(requestOrigin),
    'Content-Type': contentType,
  };
}

// Simple in-memory rate limiter with sliding window
const rateLimitStore = new Map<string, { timestamps: number[]; }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }
  
  // Remove timestamps outside the window (sliding window)
  entry.timestamps = entry.timestamps.filter(ts => now - ts < config.windowMs);
  
  const allowed = entry.timestamps.length < config.maxRequests;
  
  if (allowed) {
    entry.timestamps.push(now);
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const oldestInWindow = entry.timestamps[0] || now;
  const resetIn = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);
  
  return { allowed, remaining, resetIn: Math.max(0, resetIn) };
}

// Rate limit response helper with security headers
export function rateLimitResponse(corsHeaders: Record<string, string>, resetIn: number): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded', 
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: resetIn 
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
      } 
    }
  );
}

// Error response helper with proper security headers
export function errorResponse(
  corsHeaders: Record<string, string>, 
  message: string, 
  status = 500,
  code?: string
): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      code: code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
      } 
    }
  );
}

// Success response helper with proper security headers
export function successResponse(
  corsHeaders: Record<string, string>, 
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
      } 
    }
  );
}

// Structured logging utility with Sentry-compatible format
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Environment-based log level (default to 'info' in production)
const ENV_LOG_LEVEL: LogLevel = (Deno.env.get('LOG_LEVEL') as LogLevel) || 'info';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  requestId?: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
  // Sentry-compatible fields
  fingerprint?: string[];
  tags?: Record<string, string>;
  user?: { id?: string; email?: string; };
}

export class Logger {
  private functionName: string;
  private requestId?: string;
  
  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId;
  }
  
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }
  
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[ENV_LOG_LEVEL];
  }
  
  private formatLog(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      requestId: this.requestId,
      data,
    };
  }
  
  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(JSON.stringify(this.formatLog('debug', message, data)));
    }
  }
  
  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify(this.formatLog('info', message, data)));
    }
  }
  
  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.formatLog('warn', message, data)));
    }
  }
  
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const logEntry = this.formatLog('error', message, data);
      if (error) {
        logEntry.error = error.message;
        logEntry.stack = error.stack;
        // Generate fingerprint for Sentry grouping
        logEntry.fingerprint = [this.functionName, error.name, message];
      }
      console.error(JSON.stringify(logEntry));
    }
  }
  
  // Sentry-compatible error capture
  captureException(error: Error, context?: { 
    tags?: Record<string, string>; 
    user?: { id?: string; email?: string; };
    extra?: Record<string, unknown>;
  }): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      function: this.functionName,
      message: error.message,
      requestId: this.requestId,
      error: error.message,
      stack: error.stack,
      fingerprint: [this.functionName, error.name, error.message],
      tags: context?.tags,
      user: context?.user,
      data: context?.extra,
    };
    console.error(JSON.stringify(logEntry));
  }
}

// Get client identifier for rate limiting (IP or API key)
export function getClientIdentifier(req: Request): string {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    // Use first 12 chars of API key as identifier
    return `apikey:${apiKey.substring(0, 12)}`;
  }
  
  // Fall back to CF-Connecting-IP or X-Real-IP
  const ip = req.headers.get('cf-connecting-ip') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('x-forwarded-for')?.split(',')[0] ||
             'unknown';
  return `ip:${ip}`;
}

// Generate unique request ID
export function generateRequestId(): string {
  return crypto.randomUUID();
}

// Input validation helpers
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
}

export function validateEmail(value: string, fieldName: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid email`);
  }
}

export function validateMaxLength(value: string, maxLength: number, fieldName: string): void {
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }
}

// Custom validation error
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Sanitize input (basic XSS prevention)
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Handle OPTIONS preflight request
export function handlePreflight(corsHeaders: Record<string, string>): Response {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  });
}

// Wrap handler with common error handling and logging
export function withErrorHandling(
  handler: (req: Request, logger: Logger, corsHeaders: Record<string, string>) => Promise<Response>,
  functionName: string
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = generateRequestId();
    const logger = new Logger(functionName, requestId);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    
    // Add request ID to response headers
    const headersWithRequestId = {
      ...corsHeaders,
      'X-Request-ID': requestId,
    };
    
    try {
      // Handle preflight
      if (req.method === 'OPTIONS') {
        return handlePreflight(headersWithRequestId);
      }
      
      logger.info('Request received', { 
        method: req.method, 
        url: req.url,
        userAgent: req.headers.get('user-agent'),
      });
      
      const response = await handler(req, logger, headersWithRequestId);
      
      logger.info('Request completed', { status: response.status });
      
      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Validation error', { error: error.message });
        return errorResponse(headersWithRequestId, error.message, 400, 'VALIDATION_ERROR');
      }
      
      logger.captureException(
        error instanceof Error ? error : new Error(String(error)),
        { tags: { function: functionName }, extra: { requestId } }
      );
      
      return errorResponse(headersWithRequestId, 'Internal server error', 500);
    }
  };
}
