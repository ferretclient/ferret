import type { App as FerretApp } from '@ferret-app/schema-types/collection/item';

export interface OpenCollectionApp {
  enabled?: boolean;
  code?: string;
}

export const toOpenCollectionApp = (app: FerretApp | null | undefined): OpenCollectionApp | undefined => {
  // The app block persists when enabled even before any code is written.
  if (!app || (!app.code && app.enabled !== true)) return undefined;
  const ocApp: OpenCollectionApp = {};
  if (app.enabled === true) {
    ocApp.enabled = true;
  }
  if (app.code) {
    ocApp.code = app.code;
  }
  return ocApp;
};

export const toFerretApp = (app: OpenCollectionApp | null | undefined): FerretApp | null => {
  if (!app) return null;
  return {
    enabled: app.enabled === true,
    code: app.code || null
  };
};
