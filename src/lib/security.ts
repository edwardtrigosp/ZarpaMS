/**
 * Security utilities and middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Rate limiting store (in-memory, use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiting middleware
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
}) {
  return async (req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 0,
        resetAt: now + options.windowMs,
      };
      rateLimitStore.set(key, record);
    }

    record.count++;

    const allowed = record.count <= options.maxRequests;
    const remaining = Math.max(0, options.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetAt: record.resetAt,
    };
  };
}

/**
 * Validate API Key from request headers
 */
export function validateApiKey(req: NextRequest): { valid: boolean; error?: string } {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return { valid: false, error: 'API key is required. Include X-API-Key header or Authorization Bearer token.' };
  }

  // Get API key from environment
  const validApiKey = process.env.API_SECRET_KEY;

  if (!validApiKey) {
    console.error('API_SECRET_KEY not configured in environment variables');
    return { valid: false, error: 'Server configuration error' };
  }

  if (apiKey !== validApiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

/**
 * Verify Meta webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  // Meta sends signature as "sha256=<hash>"
  const signatureParts = signature.split('=');
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    return false;
  }

  const expectedSignature = signatureParts[1];

  // Calculate HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Sanitize phone number to E.164 format
 */
export function sanitizePhoneNumber(phone: string): { valid: boolean; sanitized?: string; error?: string } {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it starts with +
  if (!cleaned.startsWith('+')) {
    return { 
      valid: false, 
      error: 'Phone number must start with + and country code (E.164 format). Example: +5215551234567' 
    };
  }

  // Remove the + for length validation
  const digits = cleaned.substring(1);

  // E.164 format: 1-15 digits after country code
  if (digits.length < 7 || digits.length > 15) {
    return { 
      valid: false, 
      error: 'Phone number must have between 7 and 15 digits after country code' 
    };
  }

  // Check if all characters after + are digits
  if (!/^\d+$/.test(digits)) {
    return { 
      valid: false, 
      error: 'Phone number must contain only digits after +' 
    };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[\\]/g, '') // Remove backslashes
    .trim();
}

/**
 * Validate template content for WhatsApp compliance
 */
export function validateTemplateContent(content: string): { valid: boolean; error?: string } {
  // WhatsApp template restrictions
  if (content.length > 1024) {
    return { valid: false, error: 'Template content cannot exceed 1024 characters' };
  }

  if (!content.trim()) {
    return { valid: false, error: 'Template content cannot be empty' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Template contains potentially malicious content' };
    }
  }

  return { valid: true };
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}

/**
 * Sanitize configuration data before sending to client
 */
export function sanitizeConfigForClient(config: any) {
  return {
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    webhookVerifyToken: config.webhookVerifyToken,
    isVerified: config.isVerified,
    dailyLimit: config.dailyLimit,
    peakLimit: config.peakLimit,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    // ❌ DO NOT send accessToken to client
    // accessToken: config.accessToken, // NEVER!
  };
}

/**
 * Validate request origin (optional - for CSRF protection)
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ];

  if (!origin) {
    // Allow requests without origin (e.g., from curl, Postman)
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Log security events (for audit trail)
 */
export function logSecurityEvent(event: {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_INPUT' | 'SUSPICIOUS_ACTIVITY';
  ip: string;
  endpoint: string;
  details?: string;
}) {
  const timestamp = new Date().toISOString();
  // In production, send to logging service (e.g., Datadog, Sentry)
  console.warn(`[SECURITY] ${timestamp} - ${event.type}:`, {
    ip: event.ip,
    endpoint: event.endpoint,
    details: event.details,
  });
}
