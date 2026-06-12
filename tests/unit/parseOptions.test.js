import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/config/parseOptions.js';

describe('parseOptions', () => {
  it('reads data attributes', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'chart';
    element.dataset.visSource = '/data.json';
    element.dataset.visCtl = 'true';

    expect(parseOptions(element)).toEqual({
      type: 'chart',
      source: '/data.json',
      area: 'vc-58-59-60',
      ctl: true,
      hectads: true
    });
  });

  it('defaults ctl to false when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).ctl).toBe(false);
  });

  it('defaults hectads to true when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).hectads).toBe(true);
  });

  it('parses hectads false when supplied as false', () => {
    const element = document.createElement('div');
    element.dataset.visHectads = 'false';

    expect(parseOptions(element).hectads).toBe(false);
  });
});
