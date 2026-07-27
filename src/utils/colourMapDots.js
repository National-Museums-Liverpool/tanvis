export const D3_DEPENDENCY_MESSAGE = 'D3 is not available. Include d3.v7.min.js to use Tanvis mapping.';

function getD3() {
  // Expose D3 via the global object so unit tests can provide it without
  // bundling D3 into the library build used by Rollup.
  const globalD3 = globalThis.d3 ?? globalThis.window?.d3;

  if (!globalD3?.scaleSequential || !globalD3?.interpolateCividis || !globalD3?.interpolateViridis) {
    throw new Error(D3_DEPENDENCY_MESSAGE);
  }

  return globalD3;
}

export function resolveColours(recs, transform, colourScale) {
  const d3 = getD3();

  let colouredRecs = recs.map(r => ({ ...r }));

  // Carry out any mathematical transformation requested
  switch (transform) {
    case "deciles":
      colouredRecs = transDeciles(colouredRecs, 'val');
      break;
    case "sqrt":
      colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.sqrt(r.val) }));
      break;
    case "cbrt":
      colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.cbrt(r.val) }));
      break;
    case "log":
      colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.log(r.val) }));
      break;
    case "log10":
      colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.log10(r.val) }));
      break;
    default:
      break;
  }

  const minVal = Math.min(...colouredRecs.map(r => r.val));
  const maxVal = Math.max(...colouredRecs.map(r => r.val));

  const colourTrans = d3.scaleSequential()
    .domain([minVal, maxVal])

  switch (colourScale) {
    case "cividis":
      colourTrans.interpolator(d3.interpolateCividis);
      colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourTrans(r.val) }));
      break;
    case "viridis":
      colourTrans.interpolator(d3.interpolateViridis);
      colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourTrans(r.val) }));
      break;
    default:
      colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourScale }));
      break;
  }

  console.log('colouredRecs', colouredRecs);

  return colouredRecs;
}


function transDeciles(arr, key) {
  // 1. Create a shallow copy and sort by the target key ascending
  const sorted = [...arr].sort((a, b) => a[key] - b[key]);
  const total = sorted.length;
  
  // 2. Count frequencies of each unique value
  const counts = {};
  for (const item of sorted) {
    const val = item[key];
    counts[val] = (counts[val] || 0) + 1;
  }
  
  // 3. Map unique values to their respective deciles based on cumulative count
  const valueToDecile = {};
  let cumulativeCount = 0;
  
  for (const item of sorted) {
    const val = item[key];
    
    // Skip if we already assigned a decile to this unique value
    if (valueToDecile[val] !== undefined) continue;
    
    // Add the full weight of this value group to the cumulative total
    cumulativeCount += counts[val];
    
    // Calculate decile (1-10) using the midpoint/end of the current cluster
    let decile = Math.ceil((cumulativeCount / total) * 10);
    
    // Ensure boundaries stay within 1 and 10
    decile = Math.max(1, Math.min(10, decile));
    
    valueToDecile[val] = decile;
  }
  
  // 4. Replace the original values with their corresponding deciles in the array
  arr.forEach(item => {
    item[key] = valueToDecile[item[key]];
  });

  return arr;
}
