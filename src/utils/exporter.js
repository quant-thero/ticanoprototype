// =====================================================================
//  Export utilities — CSV and Excel (xlsx), with Ticano report branding
// =====================================================================
import * as XLSX from 'xlsx';

const titleFromFilename = (f) =>
  String(f || 'Ticano Report')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Branded header rows prepended to every export so all reports — not just
// PDFs — carry consistent Ticano branding (company name, title, date).
const brandingRows = (title) => [
  ['TICANO GROUP'],
  [title],
  [`Generated: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
  ['ticanogroup.co.bw'],
  [],
];

/**
 * Export an array of plain objects to CSV or Excel with a branded header.
 * @param {Array<Object>} rows   data rows
 * @param {string} filename      base filename (no extension)
 * @param {'csv'|'excel'} format
 * @param {string} [title]       report title (defaults to a prettified filename)
 */
export function exportRows(rows, filename = 'export', format = 'csv', title) {
  const reportTitle = title || titleFromFilename(filename);
  if (!rows || rows.length === 0) rows = [{ note: 'No data available' }];
  const headers = Object.keys(rows[0]);

  if (format === 'excel') {
    const aoa = [
      ...brandingRows(reportTitle),
      headers,
      ...rows.map((r) => headers.map((h) => r[h])),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  // CSV
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    ...brandingRows(reportTitle).map((r) => r.map(escape).join(',')),
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
