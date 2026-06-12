export function scan(root, selector = '.tanvis') {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return [];
  }

  return Array.from(root.querySelectorAll(selector));
}
