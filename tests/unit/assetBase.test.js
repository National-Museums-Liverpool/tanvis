import { afterEach, describe, expect, it } from 'vitest';
import { resolveAssetBase } from '../../src/config/assetBase.js';

describe('assetBase config', () => {
  const originalTanvis = window.Tanvis;

  afterEach(() => {
    if (originalTanvis === undefined) {
      delete window.Tanvis;
    } else {
      window.Tanvis = originalTanvis;
    }
    document.querySelectorAll('[data-asset-base-test]').forEach((script) => script.remove());
  });

  it('uses the configured asset base', () => {
    window.Tanvis = { config: { assetBase: 'https://example.test/tanvis/assets' } };

    expect(resolveAssetBase()).toBe('https://example.test/tanvis/assets/');
  });

  it('derives the asset base from the WordPress script directory', () => {
    window.Tanvis = {};
    const script = document.createElement('script');
    script.dataset.assetBaseTest = '';
    script.src = '/wp-content/plugins/tanvis/assets/tanvis.iife.js';
    document.head.appendChild(script);

    expect(resolveAssetBase()).toBe(new URL('/wp-content/plugins/tanvis/assets/', window.location.href).href);
  });

  it('derives the asset base from the project root for a local dist script', () => {
    window.Tanvis = {};
    const script = document.createElement('script');
    script.dataset.assetBaseTest = '';
    script.src = '/tanvis/dist/tanvis.iife.js';
    document.head.appendChild(script);

    expect(resolveAssetBase()).toBe(new URL('/tanvis/', window.location.href).href);
  });

  it('derives the project root for the GitHub Pages site', () => {
    window.Tanvis = {};
    const script = document.createElement('script');
    script.dataset.assetBaseTest = '';
    script.src = 'https://national-museums-liverpool.github.io/tanvis/dist/tanvis.iife.js';
    document.head.appendChild(script);

    expect(resolveAssetBase()).toBe('https://national-museums-liverpool.github.io/tanvis/');
  });
});