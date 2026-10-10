// Returns the URL (with trailing slash) of the folder containing the data/ resources.
// Hosts can set window.Tanvis.config.assetBase; otherwise it is derived from the
// directory containing tanvis.iife.js.
export function resolveAssetBase() {
  const override = typeof window !== 'undefined' ? window.Tanvis?.config?.assetBase : undefined;
  if (typeof override === 'string' && override) {
    return override.endsWith('/') ? override : `${override}/`;
  }

  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute('src');
    if (src && src.includes('tanvis.iife.js')) {
      return new URL('.', scripts[i].src).href;
    }
  }
  return '';
}
