const renderers = new Map();

export function registerRenderer(name, renderer) {
  renderers.set(name, renderer);
}

export function unregisterRenderer(name) {
  renderers.delete(name);
}

export function resetRenderers() {
  renderers.clear();
}

export function getRenderer(name) {
  return renderers.get(name);
}
