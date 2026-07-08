import type { HubRole, RbacAssignment } from '@vaagatech/snapline-hub-core';

export interface RbacAssignmentInput {
  principal: string;
  project?: string;
  role: HubRole;
  label?: string;
}

export interface RbacStore {
  listAssignments(): RbacAssignment[] | Promise<RbacAssignment[]>;
  addAssignment(input: RbacAssignmentInput): RbacAssignment | Promise<RbacAssignment>;
  deleteAssignment(id: string): boolean | Promise<boolean>;
}

export const RBAC_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS rbac_roles (
  id TEXT PRIMARY KEY,
  principal TEXT NOT NULL,
  project TEXT,
  role TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rbac_principal ON rbac_roles(principal);
`;
