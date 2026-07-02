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
      boundaries: false,
      hectads: true
    });
  });

  it('defaults ctl to false when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).ctl).toBe(false);
  });

  it('defaults boundaries to false when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).boundaries).toBe(false);
  });

  it('parses boundaries true when supplied as true', () => {
    const element = document.createElement('div');
    element.dataset.visBoundaries = 'true';

    expect(parseOptions(element).boundaries).toBe(true);
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

  it('does not include expand when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element)).not.toHaveProperty('expand');
  });

  it('parses expand true when supplied as true', () => {
    const element = document.createElement('div');
    element.dataset.visExpand = 'true';

    expect(parseOptions(element).expand).toBe(true);
  });

  it('parses expand false when supplied as false', () => {
    const element = document.createElement('div');
    element.dataset.visExpand = 'false';

    expect(parseOptions(element).expand).toBe(false);
  });

  it('does not include width when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element)).not.toHaveProperty('width');
  });

  it('parses width when supplied as a positive number', () => {
    const element = document.createElement('div');
    element.dataset.visWidth = '640';

    expect(parseOptions(element).width).toBe(640);
  });

  it('ignores width when supplied as a non-positive number', () => {
    const element = document.createElement('div');
    element.dataset.visWidth = '0';

    expect(parseOptions(element)).not.toHaveProperty('width');
  });

  it('does not include height when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element)).not.toHaveProperty('height');
  });

  it('parses height when supplied as a positive number', () => {
    const element = document.createElement('div');
    element.dataset.visHeight = '480';

    expect(parseOptions(element).height).toBe(480);
  });

  it('ignores height when supplied as a non-positive number', () => {
    const element = document.createElement('div');
    element.dataset.visHeight = '-10';

    expect(parseOptions(element)).not.toHaveProperty('height');
  });
});
