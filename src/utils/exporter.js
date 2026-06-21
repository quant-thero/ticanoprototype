// =====================================================================
//  Export utilities — CSV and Excel (xlsx)
// =====================================================================
import * as XLSX from 'xlsx';

/**
 * Export an array of plain objects to CSV or Excel.
 * @param {Array<Object>} rows   data rows
 * @param {string} filename      base filename (no extension)
 * @param {'csv'|'excel'} format
 */
export function exportRows(rows, filename = 'export', format = 'csv') {
  if (!rows || rows.length === 0) {
    rows = [{ note: 'No data available' }];
  }

  if (format === 'excel') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  // CSV
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
