// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add others if needed (e.g., VITE_GITHUB_TOKEN — though avoid exposing tokens in frontend!)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
