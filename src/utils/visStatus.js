const VIS_STATUS_CLASS = 'tanvis-vis-status';
const VIS_STATUS_STYLES_ID = 'tanvis-vis-status-styles';
const VIS_STATUS_STYLES = `
.${VIS_STATUS_CLASS} {
  margin: 0.5rem 0 0;
  color: #4b5563;
  font: 500 0.85rem/1.3 system-ui, sans-serif;
}

.${VIS_STATUS_CLASS}.is-error {
  color: #9f1239;
}

.${VIS_STATUS_CLASS}.is-info {
  color: #92400e;
}
`;

export function createVisStatusReporter(container) {
  ensureVisStatusStyles();

  return {
    showInfo(message) {
      showStatus(container, message, 'info');
    },
    showError(message) {
      showStatus(container, message, 'error');
    },
    clear() {
      clearStatus(container);
    }
  };
}

export function ensureStylesheetDependency(reporter, { libraryName, stylesheetHints, message }) {
  if (typeof document === 'undefined' || !document.head) {
    return true;
  }

  const hints = Array.isArray(stylesheetHints)
    ? stylesheetHints.filter(Boolean)
    : [stylesheetHints].filter(Boolean);

  if (hints.length === 0) {
    return true;
  }

  const hasStylesheet = hints.some((hint) => hasStylesheetLink(hint));
  if (!hasStylesheet) {
    const resolvedMessage = message || `${libraryName} stylesheet is missing. Include ${hints[0]} to ensure the visualisation is styled correctly.`;
    reporter?.showInfo?.(resolvedMessage);
  }

  return hasStylesheet;
}

function showStatus(container, message, tone) {
  const status = ensureStatusElement(container);
  const classNames = [VIS_STATUS_CLASS];

  if (tone === 'error') {
    classNames.push('is-error');
  } else if (tone === 'info') {
    classNames.push('is-info');
  }

  status.className = classNames.join(' ');
  status.textContent = message || '';
}

function ensureStatusElement(container) {
  if (container.__tanvisVisStatusElement) {
    const status = container.__tanvisVisStatusElement;
    if (!status.isConnected) {
      container.insertBefore(status, container.firstChild);
    } else if (status.nextSibling && status.parentNode?.firstChild !== status) {
      container.insertBefore(status, container.firstChild);
    }
    return status;
  }

  const status = document.createElement('p');
  status.className = VIS_STATUS_CLASS;
  container.insertBefore(status, container.firstChild);
  container.__tanvisVisStatusElement = status;
  return status;
}

function clearStatus(container) {
  const status = container.__tanvisVisStatusElement;
  if (status?.parentNode) {
    status.parentNode.removeChild(status);
  }

  delete container.__tanvisVisStatusElement;
}

function hasStylesheetLink(stylesheetHint) {
  const normalizedHint = String(stylesheetHint || '').toLowerCase();
  if (!normalizedHint) {
    return false;
  }

  return Array.from(document.head.querySelectorAll('link[rel~="stylesheet"]')).some((link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    return href.includes(normalizedHint);
  });
}

function ensureVisStatusStyles() {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(VIS_STATUS_STYLES_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = VIS_STATUS_STYLES_ID;
  style.textContent = VIS_STATUS_STYLES;
  document.head.appendChild(style);
}