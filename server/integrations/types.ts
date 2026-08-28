export type IntegrationMode = 'live' | 'simulated';

export interface IntegrationStatus {
  name: string;
  configured: boolean;
  mode: IntegrationMode;
  provider?: string;
  detail?: string;
}

/** Result returned by every outbound integration action. */
export interface DispatchResult {
  ok: boolean;
  mode: IntegrationMode;
  provider?: string;
  /** provider-side id / reference when available */
  ref?: string;
  error?: string;
  /** raw provider response, for logging/debugging */
  raw?: unknown;
}

export function missing(...vars: string[]): string[] {
  return vars.filter((v) => !process.env[v]);
}
