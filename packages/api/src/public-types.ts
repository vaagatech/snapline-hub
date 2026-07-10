import type { HubAuthConfig } from '@vaagatech/snapline-hub-core';
import type { Express, RequestHandler } from 'express';

/** Minimal public surface for embedders — full types live in the hub server. */
export interface ReportStore {
  readonly driver: string;
  close(): void | Promise<void>;
}

export interface RbacStore {
  listAssignments(): unknown;
  addAssignment(input: unknown): unknown;
  deleteAssignment(id: string): unknown;
}

export interface CreateAppOptions {
  dbPath?: string;
  store?: ReportStore;
  rbacStore?: RbacStore;
  authConfig?: HubAuthConfig;
  port?: number;
  webDist?: string;
}

export interface HubAppInstance {
  app: Express;
  store: ReportStore;
  database: ReportStore;
  rbacStore: RbacStore;
  authConfig: HubAuthConfig;
  port: number;
  host: string;
}

export type CreateApp = (options?: CreateAppOptions) => HubAppInstance;
export type CreateReportStore = (config?: unknown) => Promise<ReportStore>;
export type CreateReportStoreSync = (config?: unknown) => ReportStore;
export type LoadAuthConfig = () => HubAuthConfig;
export type CreateAuthMiddleware = (
  authConfig: HubAuthConfig,
  rbacStore: RbacStore,
) => RequestHandler;
