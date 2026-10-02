import html2pdf from 'html2pdf.js';
import { DataType, SidataRecord, typeLabels, formFields } from '@/lib/sidata-config';
import { showSidataToast } from '@/components/sidata/Toast';
import {
  buildFileDirectUrl,
  buildFileOpenRedirectUrl,
  escapeHtmlAttribute,
  escapeHtmlText,
  getCleanStorageFileName,
  isImageFileUrl,
} from '@/lib/file-link-utils';

// ─── Shared PDF export helper ───
// Single source of truth for every "Ekspor PDF" in SIDATA: the toolbar export,
// the detail-modal export, and the green download button in the AKSI column.
// The rendered output is identical to the original implementation:
// "Laporan <Menu>" title, "Di cetak pada" (id-ID), "Data dikirim pada"/
// "Total data", indigo table header with white text, file cells as links to
// the original Supabase storage files, and the © footer.

export interface PdfColumn {
  id: string;
  label: string;
  isFile: boolean;
}

export interface ExportPDFOptions {
  /** Third line under the title. 'submit' = "Data dikirim pada" (single record), 'total' = "Total data : N record" (toolbar). */
  subtitle?: 'submit' | 'total';
  /** Output file name. Defaults to "<Laporan_Menu>_<YYYY-MM-DD>.pdf". */
  fileName?: string;
}

// Column set for a report page — same fields/labels as the Detail modal
// (formFields, html fields excluded), including the file columns.
export function buildPdfColumns(type: DataType): PdfColumn[] {
  const fields = (formFields[type] || []).filter(f => f.type !== 'html');
  const getFieldLabel = (f: { id: string; label: string }) => {
    if (f.id === 'foto_tamu') return 'Foto Tamu';
    if (f.id === 'foto_perjalanan') return 'Foto Perjalanan';
    if (f.id === 'foto_lembur') return 'Foto Dokumentasi';
    return f.label;
  };
  return fields.map(f => ({
    id: f.id,
    label: getFieldLabel(f),
    isFile: f.type === 'file',
  }));
}

// Identity of a record, used for the per-record file name
const IDENTITY_FIELDS: Partial<Record<DataType, string[]>> = {
  surat_masuk: ['nomor_buku', 'nomor_surat'],
};

export function recordIdentity(item: SidataRecord): string {
  const candidates = IDENTITY_FIELDS[item.type] || [];
  for (const field of candidates) {
    const value = item[field];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return item.id;
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'record';
}

export function buildRecordPdfFileName(item: SidataRecord): string {
  const menu = typeLabels[item.type].replace(/\s+/g, '-');
  return `Laporan-${menu}-${sanitizeFileName(recordIdentity(item))}.pdf`;
}

const buildTable = (columns: PdfColumn[], items: SidataRecord[]) => {
  // Adaptive sizing so EVERY table fits on A4 landscape (no A3 fallback)
  const colCount = columns.length + 1; // +1 for NO
  // Tier the density by column count
  let fontSize: number, padding: string, filePadding: string, imgMaxW: number, imgMaxH: number;
  if (colCount <= 7) {
    fontSize = 11; padding = '7px 8px'; filePadding = '5px'; imgMaxW = 95; imgMaxH = 70;
  } else if (colCount <= 10) {
    fontSize = 9; padding = '4px 5px'; filePadding = '3px'; imgMaxW = 70; imgMaxH = 55;
  } else {
    // Very wide tables (e.g. lembur with 12+ cols) — squeeze further
    fontSize = 8; padding = '3px 4px'; filePadding = '2px'; imgMaxW = 55; imgMaxH = 45;
  }

  const thCells = columns.map(col =>
    `<th style="border:1px solid #ccc;padding:${padding};background:#1e40af;color:#fff;font-size:${fontSize}px;text-align:${col.isFile ? 'center' : 'left'};word-break:break-word;">${escapeHtmlText(col.label)}</th>`
  ).join('');

  const rows = items.map((item, idx) => {
    const tdCells = columns.map(col => {
      const val = item[col.id];
      if (col.isFile) {
        const content = buildFileContentSized(val, imgMaxW, imgMaxH, fontSize);
        return `<td style="border:1px solid #ccc;padding:${filePadding};text-align:center;vertical-align:middle;">${content}</td>`;
      }
      return `<td style="border:1px solid #ccc;padding:${padding};font-size:${fontSize}px;color:#000;word-break:break-word;">${val ? escapeHtmlText(String(val)) : '-'}</td>`;
    }).join('');
    return `<tr><td style="border:1px solid #ccc;padding:${padding};font-size:${fontSize}px;text-align:center;color:#000;vertical-align:top;">${idx + 1}</td>${tdCells}</tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead><tr><th style="border:1px solid #ccc;padding:${padding};background:#1e40af;color:#fff;font-size:${fontSize}px;width:30px;text-align:center;">NO</th>${thCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const buildFileContentSized = (val: any, _maxW: number, _maxH: number, fontSize: number) => {
  if (!val) return '-';
  const fileArr: string[] = Array.isArray(val) ? val : [val];
  const contents = fileArr
    .map((v: string) => {
      if (!v) return '';
      if (v.startsWith('data:image')) {
        return `<span style="font-size:${fontSize - 1}px;color:#1e40af;">🖼️ Foto</span>`;
      }
      const directUrl = buildFileDirectUrl(v);
      if (directUrl) {
        const isImg = isImageFileUrl(directUrl);
        const displayName = getCleanStorageFileName(directUrl);
        const openUrl = buildFileOpenRedirectUrl(directUrl);
        const icon = isImg ? '🖼️' : '📄';
        return `<a href="${escapeHtmlAttribute(openUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:${fontSize - 1}px;color:#1e40af;text-decoration:underline;word-break:break-all;">${icon} ${escapeHtmlText(displayName)}</a>`;
      }
      return `<span style="font-size:${fontSize - 1}px;color:#000;">${escapeHtmlText(v)}</span>`;
    })
    .filter(Boolean)
    .join('<br/>');
  return contents || '-';
};

const executePdfExport = async (htmlContent: string, fileName: string) => {
  // Always use A4 landscape for consistency across all reports
  const pdfFormat = 'a4';
  // A4 landscape printable width ≈ 277mm; render at ~1100px for clean scaling
  const rootWidth = 1100;
  const iframe = document.createElement('iframe');
  // Iframe must be tall enough for html2canvas to capture every row of the table.
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${rootWidth + 100}px;height:100vh;opacity:0;pointer-events:none;z-index:-1;border:none;`;
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
        <html><head><meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #fff; color: #000; font-family: 'Times New Roman', serif; }
          img { display: block; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        </style>
        </head><body>
          <div id="pdf-root" style="width:${rootWidth}px;padding:25px;background:#fff;">
            ${htmlContent}
          </div>
        </body></html>`);
    iframeDoc.close();

    // Wait for layout to settle and fonts to apply before snapshotting
    await new Promise<void>(r => setTimeout(r, 250));

    const root = iframeDoc.getElementById('pdf-root');
    if (!root) throw new Error('PDF root not found');

    // Resize iframe to actual content height so html2canvas captures everything
    const contentHeight = Math.max(root.scrollHeight, root.offsetHeight, 900);
    iframe.style.height = `${contentHeight + 50}px`;
    await new Promise<void>(r => setTimeout(r, 50));

    await html2pdf().set({
      margin: 8,
      filename: fileName,
      // Keep <a href> tags clickable in the generated PDF.
      enableLinks: true,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 1.5, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', width: rootWidth, windowWidth: rootWidth, windowHeight: contentHeight + 50, scrollX: 0, scrollY: 0 },
      pagebreak: { mode: ['css', 'legacy'] },
      jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'landscape' },
    }).from(root).save();

    showSidataToast('Laporan PDF berhasil diunduh', 'success');
  } catch (err) {
    console.error('PDF export error:', err);
    showSidataToast('Gagal mengunduh PDF', 'error');
  } finally {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }
};

/**
 * Export records to PDF.
 * @param menu   report menu name, e.g. "Surat Masuk" → title "Laporan Surat Masuk"
 * @param columns column set (see buildPdfColumns)
 * @param data   records to include (a single record for per-row export)
 */
export async function exportPDF(
  menu: string,
  columns: PdfColumn[],
  data: SidataRecord[],
  opts: ExportPDFOptions = {}
) {
  const title = `Laporan ${menu}`;
  const printDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const first = data[0];
  const submitDate = first?.submitted_at
    ? new Date(first.submitted_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '-';

  const thirdLine = opts.subtitle === 'total'
    ? `Total data : ${data.length} record`
    : `Data dikirim pada : ${submitDate}`;

  const html = `
      <h2 style="text-align:center;margin:20px 0 5px;font-size:16px;font-weight:bold;color:#000;">${title}</h2>
      <p style="font-size:12px;margin:8px 0;color:#000;">Di cetak pada : ${printDate}</p>
      <p style="font-size:12px;margin:0 0 15px;color:#000;">${thirdLine}</p>
      ${buildTable(columns, data)}
      <div style="margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:10px;">
        © ${new Date().getFullYear()} Kantor Pertanahan Kabupaten Bima
      </div>
    `;

  const fileName = opts.fileName || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  await executePdfExport(html, fileName);
}
