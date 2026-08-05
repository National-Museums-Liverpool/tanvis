function normalizeNamePart(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function parseTaxonGroupDisplayNames(group) {
  const title = normalizeNamePart(group?.title);
  const friendly = normalizeNamePart(group?.friendly);

  if (friendly) {
    return {
      scientificName: title,
      vernacularName: friendly
    };
  }

  const match = title.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const [, before, inside] = match;
    return {
      scientificName: normalizeNamePart(inside),
      vernacularName: normalizeNamePart(before)
    };
  }

  return {
    scientificName: title,
    vernacularName: title
  };
}
