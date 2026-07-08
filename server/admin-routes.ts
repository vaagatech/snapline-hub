import { Router } from 'express';
import type { HubRole } from '@vaagatech/snapline-hub-core';
import { asyncHandler, requirePermission } from './middleware.js';
import type { RbacStore } from './rbac/store.js';

const VALID_ROLES: HubRole[] = ['admin', 'project_admin', 'viewer', 'automation'];

export function createAdminRouter(rbacStore: RbacStore): Router {
  const router = Router();

  router.get(
    '/rbac',
    requirePermission('admin:rbac'),
    asyncHandler(async (_req, res) => {
      const assignments = await Promise.resolve(rbacStore.listAssignments());
      res.json({ assignments });
    }),
  );

  router.post(
    '/rbac',
    requirePermission('admin:rbac'),
    asyncHandler(async (req, res) => {
      const { principal, project, role, label } = req.body ?? {};

      if (typeof principal !== 'string' || !principal.trim()) {
        res.status(400).json({ error: 'principal is required' });
        return;
      }
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
        return;
      }
      if (role !== 'admin' && project !== undefined && typeof project !== 'string') {
        res.status(400).json({ error: 'project must be a string when provided' });
        return;
      }

      const assignment = await Promise.resolve(
        rbacStore.addAssignment({
          principal: principal.trim(),
          project: typeof project === 'string' ? project.trim() : undefined,
          role,
          label: typeof label === 'string' ? label.trim() : undefined,
        }),
      );

      res.status(201).json(assignment);
    }),
  );

  router.delete(
    '/rbac/:id',
    requirePermission('admin:rbac'),
    asyncHandler(async (req, res) => {
      const id = String(req.params.id);
      const deleted = await Promise.resolve(rbacStore.deleteAssignment(id));
      if (!deleted) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      res.status(204).send();
    }),
  );

  return router;
}
