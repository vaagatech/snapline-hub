import Database from 'better-sqlite3';
import type { RbacAssignment } from '@vaagatech/snapline-hub-core';
import { RBAC_TABLE_DDL, type RbacAssignmentInput, type RbacStore } from './store.js';

export function migrateRbacSchema(db: Database.Database): void {
  db.exec(RBAC_TABLE_DDL);
}

export function createSqliteRbacStore(db: Database.Database): RbacStore {
  migrateRbacSchema(db);

  const listStmt = db.prepare(
    'SELECT id, principal, project, role, label, created_at FROM rbac_roles ORDER BY created_at DESC',
  );
  const insertStmt = db.prepare(`
    INSERT INTO rbac_roles (id, principal, project, role, label, created_at)
    VALUES (@id, @principal, @project, @role, @label, @createdAt)
  `);
  const deleteStmt = db.prepare('DELETE FROM rbac_roles WHERE id = ?');

  return {
    listAssignments() {
      const rows = listStmt.all() as Array<{
        id: string;
        principal: string;
        project: string | null;
        role: string;
        label: string | null;
        created_at: string;
      }>;
      return rows.map((row) => ({
        id: row.id,
        principal: row.principal,
        project: row.project ?? undefined,
        role: row.role as RbacAssignment['role'],
        label: row.label ?? undefined,
        createdAt: row.created_at,
      }));
    },

    addAssignment(input: RbacAssignmentInput) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      insertStmt.run({
        id,
        principal: input.principal.trim().toLowerCase(),
        project: input.project?.trim() || null,
        role: input.role,
        label: input.label?.trim() || null,
        createdAt,
      });
      return {
        id,
        principal: input.principal.trim().toLowerCase(),
        project: input.project?.trim() || undefined,
        role: input.role,
        label: input.label,
        createdAt,
      };
    },

    deleteAssignment(id: string) {
      const result = deleteStmt.run(id);
      return result.changes > 0;
    },
  };
}
