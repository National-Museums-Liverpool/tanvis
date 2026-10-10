import { fetchJson, resolveResourceUrl } from './api.js';

export async function fetchTaxonInfo(apiBase, taxonIdentifier) {
  if (!taxonIdentifier) {
    return null;
  }

  const taxonUrl = resolveResourceUrl(apiBase, `taxa/${encodeURIComponent(taxonIdentifier)}`);
  taxonUrl.searchParams.set('include', 'taxon-rank');
  const payload = await fetchJson(taxonUrl.toString(), 'Failed to load taxon rank');
  const taxon = Array.isArray(payload?.data)
    ? payload.data[0]
    : payload?.data ?? payload;

  return {
    rank: taxon?.taxon_rank__rank ?? null,
    scientificName: taxon?.taxon__scientific_name ?? taxon?.scientific_name ?? null
  };
}

export function applyTaxonOccurrenceFilter(pageUrl, taxonIdentifier, taxonInfo) {
  const rank = taxonInfo?.rank;
  const scientificName = taxonInfo?.scientificName;

  if (rank && rank !== 'Species' && scientificName) {
    pageUrl.searchParams.set('include', 'taxon,parent-taxa');
    pageUrl.searchParams.set(`${rank.toLowerCase()}__scientific_name`, scientificName);
  } else {
    pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);
  }

  return pageUrl;
}