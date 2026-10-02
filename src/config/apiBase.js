export const DEFAULT_API_BASE = 'https://tanhub.biodiverseit.co.uk/api/v1';

// Hosts (e.g. the WordPress plugin) can override the default by setting window.TANVIS_CONFIG.apiBase.
export function resolveApiBase() {
  const override = typeof window !== 'undefined' ? window.TANVIS_CONFIG?.apiBase : undefined;
  return typeof override === 'string' && override ? override : DEFAULT_API_BASE;
}
