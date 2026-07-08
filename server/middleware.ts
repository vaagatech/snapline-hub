import type { ErrorRequestHandler, RequestHandler } from 'express';
import cors from 'cors';
import { hasPermission, type HubPermission } from '@vaagatech/snapline-hub-core';

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

/** When HUB_API_KEY is set (legacy mode), require X-Hub-Api-Key on mutating requests. */
export function requireApiKey(): RequestHandler {
  const expected = process.env.HUB_API_KEY?.trim();
  return (req, res, next) => {
    if (req.hubAuth?.rbacEnabled) {
      next();
      return;
    }
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

export function requirePermission(
  permission: HubPermission,
  projectFrom?: (req: Parameters<RequestHandler>[0]) => string | undefined,
): RequestHandler {
  return (req, res, next) => {
    const principal = req.hubPrincipal;
    const auth = req.hubAuth;

    if (!auth?.rbacEnabled) {
      next();
      return;
    }

    if (!principal) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const project = projectFrom?.(req);
    if (!hasPermission(principal, permission, project)) {
      res.status(403).json({ error: 'Forbidden — insufficient permissions' });
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

/** Wrap async route handlers so rejected promises reach the error handler. */
export function asyncHandler(
  handler: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => void | Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
