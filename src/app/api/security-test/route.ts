import { NextRequest, NextResponse } from 'next/server';

/**
 * Security Testing Endpoint
 * This endpoint performs automated security tests
 * 
 * ⚠️ DISABLE THIS IN PRODUCTION ⚠️
 */

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

export async function GET(request: NextRequest) {
  const results: TestResult[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Test 1: Authentication Check
  try {
    const response = await fetch(`${baseUrl}/api/whatsapp/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401 || response.status === 403) {
      results.push({
        name: 'Authentication Protection',
        status: 'PASS',
        message: 'API endpoints are protected with authentication',
      });
    } else {
      results.push({
        name: 'Authentication Protection',
        status: 'FAIL',
        message: '❌ CRITICAL: API endpoints are accessible without authentication',
        details: { statusCode: response.status }
      });
    }
  } catch (error) {
    results.push({
      name: 'Authentication Protection',
      status: 'WARNING',
      message: 'Could not test authentication',
      details: { error: (error as Error).message }
    });
  }

  // Test 2: Rate Limiting
  try {
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(`${baseUrl}/api/templates`, {
          method: 'GET',
          headers: { 
            'X-API-Key': process.env.API_SECRET_KEY || 'test-key'
          }
        })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429).length;

    if (tooManyRequests > 0) {
      results.push({
        name: 'Rate Limiting',
        status: 'PASS',
        message: 'Rate limiting is active',
        details: { blockedRequests: tooManyRequests }
      });
    } else {
      results.push({
        name: 'Rate Limiting',
        status: 'FAIL',
        message: '❌ CRITICAL: No rate limiting detected',
      });
    }
  } catch (error) {
    results.push({
      name: 'Rate Limiting',
      status: 'WARNING',
      message: 'Could not test rate limiting',
      details: { error: (error as Error).message }
    });
  }

  // Test 3: Phone Number Validation
  try {
    const invalidPhones = [
      '123',
      'abc',
      '12345678901234567', // too long
      '+' // empty
    ];

    let validated = 0;
    for (const phone of invalidPhones) {
      const response = await fetch(`${baseUrl}/api/messages/bulk`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_SECRET_KEY || 'test-key'
        },
        body: JSON.stringify({
          templateId: 1,
          contacts: [{ phoneNumber: phone }]
        })
      });

      if (response.status === 400) {
        validated++;
      }
    }

    if (validated === invalidPhones.length) {
      results.push({
        name: 'Phone Number Validation',
        status: 'PASS',
        message: 'Phone numbers are validated correctly',
      });
    } else {
      results.push({
        name: 'Phone Number Validation',
        status: 'FAIL',
        message: '❌ Invalid phone numbers are accepted',
        details: { validated: `${validated}/${invalidPhones.length}` }
      });
    }
  } catch (error) {
    results.push({
      name: 'Phone Number Validation',
      status: 'WARNING',
      message: 'Could not test phone validation',
      details: { error: (error as Error).message }
    });
  }

  // Test 4: SQL Injection Prevention
  try {
    const sqlPayloads = [
      "'; DROP TABLE message_templates; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users--"
    ];

    let protected = 0;
    for (const payload of sqlPayloads) {
      const response = await fetch(`${baseUrl}/api/templates?search=${encodeURIComponent(payload)}`, {
        method: 'GET',
        headers: { 
          'X-API-Key': process.env.API_SECRET_KEY || 'test-key'
        }
      });

      // If it returns 200 or 400 (bad request), it's likely protected
      // If it returns 500, it might be vulnerable
      if (response.status !== 500) {
        protected++;
      }
    }

    if (protected === sqlPayloads.length) {
      results.push({
        name: 'SQL Injection Prevention',
        status: 'PASS',
        message: 'SQL injection attempts are handled safely',
      });
    } else {
      results.push({
        name: 'SQL Injection Prevention',
        status: 'FAIL',
        message: '❌ Possible SQL injection vulnerability',
        details: { protected: `${protected}/${sqlPayloads.length}` }
      });
    }
  } catch (error) {
    results.push({
      name: 'SQL Injection Prevention',
      status: 'WARNING',
      message: 'Could not test SQL injection',
      details: { error: (error as Error).message }
    });
  }

  // Test 5: XSS Prevention
  try {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)'
    ];

    let sanitized = 0;
    for (const payload of xssPayloads) {
      const response = await fetch(`${baseUrl}/api/templates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_SECRET_KEY || 'test-key'
        },
        body: JSON.stringify({
          name: `test-${Date.now()}`,
          content: payload,
          category: 'UTILITY'
        })
      });

      if (response.status === 400) {
        sanitized++;
      }
    }

    if (sanitized === xssPayloads.length) {
      results.push({
        name: 'XSS Prevention',
        status: 'PASS',
        message: 'XSS payloads are rejected',
      });
    } else {
      results.push({
        name: 'XSS Prevention',
        status: 'WARNING',
        message: 'Some XSS payloads might not be sanitized',
        details: { sanitized: `${sanitized}/${xssPayloads.length}` }
      });
    }
  } catch (error) {
    results.push({
      name: 'XSS Prevention',
      status: 'WARNING',
      message: 'Could not test XSS prevention',
      details: { error: (error as Error).message }
    });
  }

  // Test 6: Security Headers
  try {
    const response = await fetch(`${baseUrl}/api/templates`, {
      method: 'GET',
      headers: { 
        'X-API-Key': process.env.API_SECRET_KEY || 'test-key'
      }
    });

    const headers = {
      'x-frame-options': response.headers.get('x-frame-options'),
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'x-xss-protection': response.headers.get('x-xss-protection'),
    };

    const missingHeaders = Object.entries(headers)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingHeaders.length === 0) {
      results.push({
        name: 'Security Headers',
        status: 'PASS',
        message: 'All security headers are present',
        details: headers
      });
    } else {
      results.push({
        name: 'Security Headers',
        status: 'WARNING',
        message: 'Some security headers are missing',
        details: { missing: missingHeaders }
      });
    }
  } catch (error) {
    results.push({
      name: 'Security Headers',
      status: 'WARNING',
      message: 'Could not test security headers',
      details: { error: (error as Error).message }
    });
  }

  // Test 7: Environment Variables
  const envVars = {
    'API_SECRET_KEY': !!process.env.API_SECRET_KEY,
    'TURSO_CONNECTION_URL': !!process.env.TURSO_CONNECTION_URL,
    'TURSO_AUTH_TOKEN': !!process.env.TURSO_AUTH_TOKEN,
  };

  const missingEnvVars = Object.entries(envVars)
    .filter(([_, exists]) => !exists)
    .map(([key]) => key);

  if (missingEnvVars.length === 0) {
    results.push({
      name: 'Environment Variables',
      status: 'PASS',
      message: 'All required environment variables are set',
    });
  } else {
    results.push({
      name: 'Environment Variables',
      status: 'FAIL',
      message: '❌ Missing required environment variables',
      details: { missing: missingEnvVars }
    });
  }

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'PASS').length,
    failed: results.filter(r => r.status === 'FAIL').length,
    warnings: results.filter(r => r.status === 'WARNING').length,
  };

  const score = Math.round((summary.passed / summary.total) * 100);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    score,
    summary,
    results,
    recommendation: score < 70 
      ? '🔴 CRITICAL: Immediate security improvements needed'
      : score < 90 
      ? '🟡 WARNING: Some security improvements recommended'
      : '✅ GOOD: Security measures are in place',
  });
}
