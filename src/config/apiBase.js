export const DEFAULT_API_BASE = 'https://tanhub.northwestinvertebrates.org.uk/api/v1';

// Hosts (e.g. the WordPress plugin) can override the default with window.Tanvis.config.apiBase.
export function resolveApiBase() {
  const override = typeof window !== 'undefined' ? window.Tanvis?.config?.apiBase : undefined;
  return typeof override === 'string' && override ? override : DEFAULT_API_BASE;
}
