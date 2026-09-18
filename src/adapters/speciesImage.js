import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveApiBase } from '../config/apiBase.js';

const TAXA_RESOURCE = 'taxa';
const DEFAULT_PLACEHOLDER_TEXT = 'No species image available.';

export function createSpeciesImageAdapter() {
  return {
    name: 'species-image',
    render(element, config) {
      const taxonIdSourceId = config.taxonIdSource || '';
      const shouldPreserveTaxonIdSourceSubscription = Boolean(
        element.__tanvisTaxonIdSourceCleanup
        && element.__tanvisTaxonIdSourceId === taxonIdSourceId
      );

      if (!shouldPreserveTaxonIdSourceSubscription) {
        clearTaxonIdSourceSubscription(element);
      }

      if (config.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
        element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(taxonIdSourceId, (speciesId) => {
          if (!speciesId || speciesId === element.dataset.visTaxonid) {
            return;
          }

          element.dataset.visTaxonid = speciesId;
          createSpeciesImageAdapter().render(element, {
            ...config,
            taxonId: speciesId
          });
        });
        element.__tanvisTaxonIdSourceId = taxonIdSourceId;
      }

      const status = createVisStatusReporter(element);
      const taxonIdentifier = resolveTaxonIdentifier(element, config);
      const content = ensureContentStructure(element);

      if (!taxonIdentifier) {
        status.clear();
        renderPlaceholder(content);
        return;
      }

      const loadId = (element.__tanvisSpeciesImageLoadId || 0) + 1;
      element.__tanvisSpeciesImageLoadId = loadId;
      element.dataset.visTaxonid = taxonIdentifier;

      fetchTaxonMedia({
        apiBase: resolveApiBase(),
        taxonIdentifier
      })
        .then((taxon) => {
          if (element.__tanvisSpeciesImageLoadId !== loadId) {
            return;
          }

          renderSpeciesImageContent(content, taxon, config);
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisSpeciesImageLoadId !== loadId) {
            return;
          }

          status.showError(normalizeErrorMessage(error, 'Failed to load taxon media'));
        });
    }
  };
}

function resolveTaxonIdentifier(element, config) {
  const fromDataset = normalizeValue(element?.dataset?.visTaxonid);
  if (fromDataset) {
    return fromDataset;
  }

  return normalizeValue(config?.taxonId);
}

function normalizeValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function subscribeToTaxonIdSource(taxonIdSourceId, onSpeciesSelected) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
  if (!taxonIdSourceElement) {
    return undefined;
  }

  const onTaxonIdentified = (event) => {
    const speciesId = event?.detail?.speciesId;
    if (typeof speciesId !== 'string' || !speciesId.trim()) {
      return;
    }

    onSpeciesSelected(speciesId.trim());
  };

  taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
  return () => {
    taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
  };
}

function clearTaxonIdSourceSubscription(element) {
  const cleanup = element?.__tanvisTaxonIdSourceCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisTaxonIdSourceCleanup;
  delete element.__tanvisTaxonIdSourceId;
}

async function fetchTaxonMedia({ apiBase, taxonIdentifier }) {
  const resourceUrl = resolveTaxaResourceUrl(apiBase);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);
  pageUrl.searchParams.set('include', 'taxon-media');

  const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon media');
  return getTaxonRecord(payload);
}

function resolveTaxaResourceUrl(apiBase) {
  const baseUrl = new URL(apiBase, window.location.origin);
  const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${pathname}${TAXA_RESOURCE}`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl;
}

async function fetchJson(url, defaultErrorMessage) {
  logApiRequest(url, { method: 'GET' });

  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw createApiError({ defaultMessage: defaultErrorMessage, cause });
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
  }

  return payload || {};
}

function getTaxonRecord(payload) {
  if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data[0] || {};
  }

  if (Array.isArray(payload)) {
    return payload[0] || {};
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  return {};
}

function ensureContentStructure(element) {
  if (element.__tanvisSpeciesImageContent?.isConnected) {
    return element.__tanvisSpeciesImageContent;
  }

  clearElement(element);

  const doc = element?.ownerDocument || document;
  const content = doc.createElement('div');
  content.dataset.tanvisSpeciesImage = 'content';
  element.appendChild(content);

  element.__tanvisSpeciesImageContent = content;
  return content;
}

function renderPlaceholder(content) {
  clearElement(content);
  content.textContent = DEFAULT_PLACEHOLDER_TEXT;
}

function renderSpeciesImageContent(content, taxon, config) {
  const image = selectDisplayImage(taxon?.taxon_media);

  if (!image) {
    renderPlaceholder(content);
    return;
  }

  const { url, width, height } = resolveImageSource(image, config?.imageVariant);
  const doc = content.ownerDocument || document;

  clearElement(content);

  const img = doc.createElement('img');
  img.src = url;
  img.alt = resolveAltText(image);
  content.style.width = applyImageSizing(img, config, width, height);

  content.appendChild(img);
  appendImageText(doc, content, config, image);
}

function appendImageText(doc, content, config, image) {
  const segments = [
    {
      key: 'caption',
      show: Boolean(config?.showImageCaption),
      text: normalizeValue(image?.caption)
    },
    {
      key: 'attribution',
      show: Boolean(config?.showImageAttribution),
      text: normalizeValue(image?.attribution)
    },
    {
      key: 'license',
      show: Boolean(config?.showImageLicense),
      text: normalizeValue(image?.license) ? `(${normalizeValue(image.license)})` : ''
    }
  ].filter((segment) => segment.show && segment.text);

  if (segments.length === 0) {
    return;
  }

  const textLine = doc.createElement('div');
  textLine.dataset.tanvisSpeciesImage = 'text';

  segments.forEach((segment, index) => {
    if (index > 0) {
      textLine.appendChild(doc.createTextNode(' '));
    }

    const segmentEl = doc.createElement('span');
    segmentEl.dataset.tanvisSpeciesImage = segment.key;
    segmentEl.textContent = segment.text;
    textLine.appendChild(segmentEl);
  });

  content.appendChild(textLine);
}


function selectDisplayImage(taxonMedia) {
  const images = (Array.isArray(taxonMedia) ? taxonMedia : [])
    .filter((media) => typeof media?.mime_type === 'string' && media.mime_type.startsWith('image/'));

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return images[0];
  }

  const primaryImage = images.find((media) => media.is_primary === true);
  if (primaryImage) {
    return primaryImage;
  }

  const sortOrderOf = (media) => (typeof media.sort_order === 'number' ? media.sort_order : Infinity);
  const lowestSortOrder = Math.min(...images.map(sortOrderOf));

  return images.find((media) => sortOrderOf(media) === lowestSortOrder);
}

function resolveImageSource(image, imageVariant) {
  if (imageVariant === 'large' || imageVariant === 'thumbnail') {
    const variant = image.variants?.[imageVariant];
    if (variant?.url) {
      return { url: variant.url, width: variant.width, height: variant.height };
    }
  }

  return { url: image.url, width: image.width, height: image.height };
}

function resolveAltText(image) {
  return normalizeValue(image?.alt_text) || normalizeValue(image?.caption);
}

function applyImageSizing(img, config, intrinsicWidth, intrinsicHeight) {
  if (config?.expand) {
    img.style.width = '100%';
    return '100%';
  }

  const width = config?.width;
  const height = config?.height;

  if (width && !height) {
    img.width = width;
    return `${width}px`;
  }

  if (height && !width) {
    img.height = height;
    // Compute the rendered width so the caption/attribution/license text wraps to the same width as the image.
    if (intrinsicWidth && intrinsicHeight) {
      return `${Math.round(height * (intrinsicWidth / intrinsicHeight))}px`;
    }
    return 'auto';
  }

  if (width && height) {
    img.width = width;
    img.height = height;
    return `${width}px`;
  }

  if (intrinsicWidth) {
    return `${intrinsicWidth}px`;
  }

  return 'auto';
}
