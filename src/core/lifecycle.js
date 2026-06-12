
// The object 'dataset' is the standard browser API for HTML data-* attributes.
// When code sets something like: element.dataset.tanvisRendered = 'true'
// the browser reflects that as: data-tanvis-rendered="true" on the element in the DOM.

export function markRendered(element) {
  element.dataset.tanvisRendered = 'true';
}

export function isRendered(element) {
  return element.dataset.tanvisRendered === 'true';
}

export function unmarkRendered(element) {
  delete element.dataset.tanvisRendered;
}
