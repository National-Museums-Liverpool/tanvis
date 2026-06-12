const renderers = new Map();

export function registerRenderer(name, renderer) {
  renderers.set(name, renderer);
}

export function getRenderer(name) {
  return renderers.get(name);
}
