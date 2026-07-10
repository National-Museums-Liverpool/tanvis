const listenersByControlId = new Map();
const latestEventByControlId = new Map();

export function subscribeToControl(controlId, handler) {
  if (!controlId || typeof handler !== 'function') {
    return () => {};
  }

  let listeners = listenersByControlId.get(controlId);
  if (!listeners) {
    listeners = new Set();
    listenersByControlId.set(controlId, listeners);
  }

  listeners.add(handler);

  return () => {
    const existing = listenersByControlId.get(controlId);
    if (!existing) {
      return;
    }

    existing.delete(handler);
    if (existing.size === 0) {
      listenersByControlId.delete(controlId);
    }
  };
}

export function publishControlEvent(controlId, event) {
  if (!controlId) {
    return;
  }

  latestEventByControlId.set(controlId, event);

  const listeners = listenersByControlId.get(controlId);
  if (!listeners) {
    return;
  }

  // Publish to a snapshot so subscribe/unsubscribe during a handler does not
  // mutate the current dispatch cycle and cause re-entrant loops.
  const snapshot = Array.from(listeners);
  snapshot.forEach((handler) => handler(event));
}

export function getLatestControlEvent(controlId) {
  if (!controlId) {
    return undefined;
  }

  return latestEventByControlId.get(controlId);
}
