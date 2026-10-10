// Returns the URL (with trailing slash) of the folder containing the data/ resources.
// Hosts can set window.Tanvis.config.assetBase; otherwise it is derived from the
// directory containing tanvis.iife.js, except local dist builds use the parent folder.
export function resolveAssetBase() {
  const override = typeof window !== 'undefined' ? window.Tanvis?.config?.assetBase : undefined;
  if (typeof override === 'string' && override) {
    return override.endsWith('/') ? override : `${override}/`;
  }

  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute('src');
    if (src && src.includes('tanvis.iife.js')) {
      const scriptDirectory = new URL('.', scripts[i].src);
      if (scriptDirectory.pathname.endsWith('/dist/')) {
        scriptDirectory.pathname = scriptDirectory.pathname.slice(0, -'/dist/'.length) + '/';
      }
      scriptDirectory.search = '';
      scriptDirectory.hash = '';
      return scriptDirectory.href;
    }
  }
  return '';
}
