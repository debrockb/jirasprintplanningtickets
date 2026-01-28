/**
 * Validates JQL query to prevent injection attacks
 */
export function validateJQL(jql: string): boolean {
  if (!jql || jql.trim().length === 0) return true; // Empty is valid

  // Basic validation: check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers
    /eval\(/i,
    /exec\(/i,
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(jql));
}

/**
 * Sanitizes JQL query for safe usage
 */
export function sanitizeJQL(jql: string): string {
  return jql
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .trim()
    .slice(0, 5000); // Limit length
}

/**
 * Validates and sanitizes AI prompt
 */
export function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 10000); // Reasonable limit for prompts
}

/**
 * Sanitizes field name to prevent XSS
 */
export function sanitizeFieldName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\_\-\s]/g, '')
    .trim()
    .slice(0, 200);
}

/**
 * Validates API key format (basic check)
 */
export function validateAPIKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  if (key.length < 10) return false; // Too short to be real

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /\0/, // Null bytes
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(key));
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes HTML content (for description fields)
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/on\w+=".*?"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 50000);
}
