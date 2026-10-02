import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DataType, typeLabels, formFields, SidataRecord } from './sidata-config';
import {
  buildFileDirectUrl,
  buildFileOpenRedirectUrl,
  getCleanStorageFileName,
  isImageFileUrl,
} from './file-link-utils';

const excelTypeLabels: Record<DataType, string> = {
  surat_masuk: "Laporan Surat Masuk",
  surat_keluar: "Laporan Surat Keluar",
  buku_tamu: "Laporan Buku Tamu",
  inventaris_dokumen: "Laporan Inventaris Dokumen",
  pengajuan_bpn: "Laporan Pengajuan BPN",
  perjalanan_dinas: "Laporan Perjalanan Dinas",
  agenda_rapat: "Laporan Agenda Rapat",
  lembur: "Laporan Lembur",
};

export async function exportToExcel(items: SidataRecord[], type: DataType) {
  if (items.length === 0) return false;

  const fields = (formFields[type] || []).filter(f => f.type !== 'html');
  const title = excelTypeLabels[type];
  const printDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIDATA';
  wb.created = new Date();

  const ws = wb.addWorksheet(typeLabels[type], {
    pageSetup: { orientation: 'landscape', paperSize: 9 }
  });

  // Headers
  const headerLabels = ['NO', ...fields.map(f => {
    if (f.id === 'foto_tamu') return 'Foto Tamu';
    if (f.id === 'foto_perjalanan') return 'Foto Perjalanan';
    if (f.id === 'foto_lembur') return 'Foto Dokumentasi';
    return f.label;
  })];

  const colCount = headerLabels.length;

  // Title rows
  const titleRow = ws.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(1, 1, 1, colCount);
  titleRow.alignment = { horizontal: 'center' };

  const dateRow = ws.addRow([`Dicetak pada: ${printDate}`]);
  dateRow.font = { size: 10, italic: true };
  ws.mergeCells(2, 1, 2, colCount);

  const totalRow = ws.addRow([`Total data: ${items.length} record`]);
  totalRow.font = { size: 10 };
  ws.mergeCells(3, 1, 3, colCount);

  ws.addRow([]); // empty row

  // Header row
  const headerRow = ws.addRow(headerLabels);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Set column widths
  ws.columns = headerLabels.map((h, i) => {
    if (i === 0) return { width: 5 };
    const field = fields[i - 1];
    if (field?.type === 'file') return { width: 30 };
    return { width: Math.min(Math.max(h.length + 4, 14), 40) };
  });

  // Data rows
  for (let rowIdx = 0; rowIdx < items.length; rowIdx++) {
    const item = items[rowIdx];
    const rowData: any[] = [rowIdx + 1];

    fields.forEach(f => {
      const val = item[f.id];
      if (f.type === 'file') {
        rowData.push(''); // placeholder, we handle files separately
      } else {
        rowData.push(val || '-');
      }
    });

    const dataRow = ws.addRow(rowData);
    const excelRowNum = dataRow.number;

    // Style all cells
    dataRow.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (colNum === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { size: 10 };
    });

    // Handle file fields - render as clickable hyperlinks (no image embedding for speed)
    for (let fIdx = 0; fIdx < fields.length; fIdx++) {
      const f = fields[fIdx];
      if (f.type !== 'file') continue;

      const val = item[f.id];
      const colNum = fIdx + 2;
      const cell = dataRow.getCell(colNum);

      if (!val) { cell.value = '-'; continue; }

      const fileArr: string[] = Array.isArray(val) ? val : [val];
      const links: { text: string; url: string }[] = [];
      let embeddedCount = 0;

      for (const v of fileArr) {
        if (!v) continue;
        if (v.startsWith('data:image')) { embeddedCount++; continue; }
        const directUrl = buildFileDirectUrl(v);
        if (!directUrl) continue;
        const isImg = isImageFileUrl(directUrl);
        const displayName = getCleanStorageFileName(directUrl);
        const openUrl = buildFileOpenRedirectUrl(directUrl);
        links.push({ text: `${isImg ? '🖼️' : '📄'} ${displayName}`, url: openUrl });
      }

      if (links.length === 0 && embeddedCount === 0) { cell.value = '-'; continue; }

      if (links.length === 0) {
        cell.value = `🖼️ ${embeddedCount} Foto (embedded)`;
        continue;
      }

      const primary = links[0];
      const suffix = links.length > 1 ? ` (+${links.length - 1} lainnya)` : (embeddedCount > 0 ? ` (+${embeddedCount} foto)` : '');
      cell.value = { text: `${primary.text}${suffix}`, hyperlink: primary.url } as any;
      cell.font = { size: 10, color: { argb: 'FF1E40AF' }, underline: true };
    }
  }

  // Generate and save
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);

  return true;
}

export async function exportSingleToExcel(item: SidataRecord) {
  return exportToExcel([item], item.type);
}
