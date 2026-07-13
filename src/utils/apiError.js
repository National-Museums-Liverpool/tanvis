function getPayloadMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail.trim();
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  return '';
}

export async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createApiError({ response, payload, defaultMessage, cause } = {}) {
  const payloadMessage = getPayloadMessage(payload);
  const causeMessage = typeof cause?.message === 'string' ? cause.message.trim() : '';
  const fallbackMessage = defaultMessage || 'Request failed';
  const message = payloadMessage || causeMessage || fallbackMessage;

  const error = new Error(message);
  error.name = 'ApiError';
  error.isApiError = true;

  if (Number.isFinite(response?.status)) {
    error.status = response.status;
  }

  if (typeof cause !== 'undefined') {
    error.cause = cause;
  }

  return error;
}

export function normalizeErrorMessage(error, fallbackMessage = 'An unexpected error occurred') {
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : fallbackMessage;

  if (error?.isApiError) {
    return `API error: ${message}`;
  }

  return message;
}