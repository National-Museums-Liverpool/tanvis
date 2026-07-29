import { describe, it, expect } from 'vitest';
import { DEFAULT_API_BASE, resolveApiBase } from '../../src/config/apiBase.js';

describe('apiBase config', () => {
  it('exports the shared default api base', () => {
    expect(DEFAULT_API_BASE).toBe('https://tanhub.biodiverseit.co.uk/api/v1');
  });

  it('always returns the shared default api base', () => {
    expect(resolveApiBase()).toBe(DEFAULT_API_BASE);
    expect(resolveApiBase('https://example.com/api/v2')).toBe(DEFAULT_API_BASE);
  });
});
