// Wrapper to adapt BRC Charts for use in Tanvis.
// This allows users to specify BRC Charts as a visualization 
// type in their HTML, and have them rendered using the BRC Charts library.

export function createBrcChartsAdapter() {
  return {
    name: 'brc-charts',
    render() {
      throw new Error('BRC charts adapter not implemented yet');
    }
  };
}
