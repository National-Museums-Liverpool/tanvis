import { afterEach, describe, it, expect } from 'vitest';
import { DEFAULT_API_BASE, resolveApiBase } from '../../src/config/apiBase.js';

describe('apiBase config', () => {
  const originalTanvis = window.Tanvis;

  afterEach(() => {
    if (originalTanvis === undefined) {
      delete window.Tanvis;
    } else {
      window.Tanvis = originalTanvis;
    }
  });

  it('exports the shared default api base', () => {
    expect(DEFAULT_API_BASE).toBe('https://tanhub.northwestinvertebrates.org.uk/api/v1');
  });

  it('returns the shared default api base when no override is configured', () => {
    delete window.Tanvis;
    expect(resolveApiBase()).toBe(DEFAULT_API_BASE);
  });

  it('uses the api base configured on window.Tanvis', () => {
    window.Tanvis = { config: { apiBase: 'https://example.com/api/v2' } };

    expect(resolveApiBase()).toBe('https://example.com/api/v2');
  });

  it('falls back when the configured api base is empty', () => {
    window.Tanvis = { config: { apiBase: '' } };

    expect(resolveApiBase()).toBe(DEFAULT_API_BASE);
  });
});
