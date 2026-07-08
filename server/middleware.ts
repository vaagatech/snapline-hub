import type { ErrorRequestHandler, RequestHandler } from 'express';
import cors from 'cors';

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3847',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3847',
];

export function createCorsMiddleware() {
  const configured = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  const origin = configured?.length ? configured : DEFAULT_ORIGINS;
  return cors({ origin });
}

/** When HUB_API_KEY is set, require X-Hub-Api-Key on mutating requests. */
export function requireApiKey(): RequestHandler {
  const expected = process.env.HUB_API_KEY?.trim();
  return (req, res, next) => {
    if (!expected) {
      next();
      return;
    }
    const provided = req.header('x-hub-api-key');
    if (provided !== expected) {
      res.status(401).json({ error: 'Unauthorized — invalid or missing X-Hub-Api-Key' });
      return;
    }
    next();
  };
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error('[snapline-hub]', err);
  res.status(500).json({ error: 'Internal server error' });
};
