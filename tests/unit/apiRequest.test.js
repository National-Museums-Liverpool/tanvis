import { describe, it, expect, vi, afterEach } from 'vitest';
import { logApiRequest } from '../../src/utils/apiRequest.js';

describe('apiRequest logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs GET requests to the console', () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

    logApiRequest('https://example.test/api/v1/taxon-stats');

    expect(consoleInfo).toHaveBeenCalledWith(
      '[api-request] GET https://example.test/api/v1/taxon-stats'
    );
  });
});
