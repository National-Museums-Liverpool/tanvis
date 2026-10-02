const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

function createLinkColumn(entry) {
  const [title, text, urlTemplate] = entry.split('^^');

  return {
    title,
    field: 'speciesId',
    headerSort: false,
    formatter: (cell) => {
      const speciesId = cell.getValue();
      if (!speciesId) {
        return '';
      }

      const href = urlTemplate.replaceAll('<tvk>', encodeURIComponent(speciesId));
      let parsed;
      try {
        parsed = new URL(href, window.location.href);
      } catch {
        return '';
      }
      if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
        return '';
      }

      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = text;
      anchor.rel = 'noopener';
      // Stop the click from also triggering the row's taxon-identified selection.
      anchor.addEventListener('click', (event) => event.stopPropagation());
      return anchor;
    }
  };
}

// Returns Tabulator column definitions for a '^^^'-separated list of 'Title^^Text^^URL' links.
export function createLinkColumns(linkValue) {
  if (typeof linkValue !== 'string' || !linkValue) {
    return [];
  }

  return linkValue.split('^^^').map((entry) => entry.trim()).filter(Boolean).map(createLinkColumn);
}
