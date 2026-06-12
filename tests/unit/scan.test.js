import { describe, it, expect } from 'vitest';
import { scan } from '../../src/scan.js';

describe('scan', () => {
  it('returns matching elements', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="tanvis"></div><div></div>';

    expect(scan(root, '.tanvis')).toHaveLength(1);
  });
});
