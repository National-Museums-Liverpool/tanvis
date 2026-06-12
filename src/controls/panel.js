import { ensureSharedStyles } from '../styles/sharedStyles.js';

export function createControlsPanel(options = {}) {
  ensureSharedStyles();

  const label = options.label || 'Data options';
  const ariaLabel = options.ariaLabel || 'Toggle controls';
  const expanded = options.expanded !== false;

  const panel = document.createElement('div');
  panel.className = 'tanvis-controls';

  const header = document.createElement('div');
  header.className = 'tanvis-controls-header';
  panel.appendChild(header);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tanvis-controls-toggle';
  toggle.setAttribute('aria-label', ariaLabel);
  toggle.setAttribute('aria-expanded', String(expanded));
  header.appendChild(toggle);

  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'tanvis-controls-toggle-icon';
  toggleIcon.setAttribute('aria-hidden', 'true');
  toggleIcon.textContent = '⚙';

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'tanvis-controls-toggle-label';
  toggleLabel.textContent = label;

  toggle.appendChild(toggleIcon);
  toggle.appendChild(toggleLabel);

  const body = document.createElement('div');
  body.className = 'tanvis-controls-group';
  body.hidden = !expanded;
  panel.appendChild(body);

  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !isExpanded;
    toggle.setAttribute('aria-expanded', String(nextExpanded));
    body.hidden = !nextExpanded;
  });

  return { panel, body, toggle };
}