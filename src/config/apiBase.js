export const DEFAULT_API_BASE = 'https://tanhub.biodiverseit.co.uk/api/v1';

export function resolveApiBase(source) {
  return source || DEFAULT_API_BASE;
}
