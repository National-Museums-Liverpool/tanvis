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

function showStatus(container, message, tone) {
  const status = ensureStatusElement(container);
  status.className = tone === 'error' ? `${VIS_STATUS_CLASS} is-error` : VIS_STATUS_CLASS;
  status.textContent = message || '';
}

function ensureStatusElement(container) {
  if (container.__tanvisVisStatusElement && container.__tanvisVisStatusElement.isConnected) {
    return container.__tanvisVisStatusElement;
  }

  const status = document.createElement('p');
  status.className = VIS_STATUS_CLASS;
  container.appendChild(status);
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