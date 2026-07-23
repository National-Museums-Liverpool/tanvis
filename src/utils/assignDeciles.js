export function assignDeciles(arr, key) {
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
  
  // 4. Map the deciles back to the original array structure
  return arr.map(item => ({
    ...item,
    decile: valueToDecile[item[key]]
  }));
}