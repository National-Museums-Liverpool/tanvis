import { createRecordsTableAdapter } from '../adapters/recordsTable.js';

const recordsTableAdapter = createRecordsTableAdapter();

export function renderRecordsTable(element, config) {
  recordsTableAdapter.render(element, config);
}
