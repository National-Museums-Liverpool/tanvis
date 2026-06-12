// Placeholder for Tabulator adapter.
// This will allow users to specify Tabulator tables as a visualization 
// type in their HTML, and have them rendered using the Tabulator library.  

export function createTabulatorAdapter() {
  return {
    name: 'tabulator',
    render() {
      throw new Error('Tabulator adapter not implemented yet');
    }
  };
}
