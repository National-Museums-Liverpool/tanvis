export function logApiRequest(url, options = {}) {
  const method = (options?.method || 'GET').toUpperCase();
  console.info(`[api-request] ${method} ${url}`);
}
