// Returns the URL (with trailing slash) of the folder containing the data/ resources.
// Hosts can set window.TANVIS_CONFIG.assetBase; otherwise it is derived from the
// script URL by stripping /dist/tanvis.iife.js (the script may be served from a subfolder).
export function resolveAssetBase() {
  const override = typeof window !== 'undefined' ? window.TANVIS_CONFIG?.assetBase : undefined;
  if (typeof override === 'string' && override) {
    return override.endsWith('/') ? override : `${override}/`;
  }

  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute('src');
    if (src && src.includes('tanvis.iife.js')) {
      const scriptUrl = scripts[i].src;
      return scriptUrl.substring(0, scriptUrl.indexOf('/dist/tanvis.iife.js') + 1);
    }
  }
  return '';
}
