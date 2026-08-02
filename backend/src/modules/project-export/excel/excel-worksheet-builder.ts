import { Worksheet } from 'exceljs';
import { ProjectExportData } from '../project-export.types';

export abstract class ExcelWorksheetBuilder {
  abstract readonly name: string;

  abstract build(worksheet: Worksheet, data: ProjectExportData): void;

  protected table(
    worksheet: Worksheet,
    headers: string[],
    rows: Array<Array<string | number | Date | null | undefined>>,
  ) {
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = { from: 'A1', to: `${columnName(headers.length)}1` };
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    header.alignment = { vertical: 'middle' };
    header.height = 22;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6F9' } };
      }
    });
    worksheet.columns.forEach((column) => {
      let width = 12;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        width = Math.max(width, String(cell.value ?? '').length + 2);
      });
      column.width = Math.min(width, 42);
    });
    headers.forEach((header, index) => {
      if (/date|modified/i.test(header)) {
        worksheet.getColumn(index + 1).numFmt = 'dd-mmm-yyyy';
      }
    });
    worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }
}

export function displayUser(user?: { firstName?: string; lastName?: string; email?: string } | null) {
  if (!user) return '';
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || '';
}

export function formatDate(value?: string | Date | null) {
  return value ? new Date(value) : null;
}

function columnName(index: number) {
  let result = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    index = Math.floor((index - 1) / 26);
  }
  return result;
}
