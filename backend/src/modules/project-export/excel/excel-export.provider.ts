import { Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ProjectExportData, ProjectExportProvider } from '../project-export.types';
import { ExcelWorksheetBuilder } from './excel-worksheet-builder';
import { EXCEL_WORKSHEET_BUILDERS } from './excel.constants';
@Injectable()
export class ExcelExportProvider implements ProjectExportProvider {
  constructor(
    @Inject(EXCEL_WORKSHEET_BUILDERS)
    private readonly builders: ExcelWorksheetBuilder[],
)   {}

  async export(data: ProjectExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PM Platform'; workbook.company = 'PM Platform'; workbook.subject = `Project export: ${data.project.name}`; workbook.title = data.project.name;
    for (const builder of this.builders) {
      const worksheet = workbook.addWorksheet(builder.name);
      builder.build(worksheet, data);
      if (worksheet.rowCount <= 1 && builder.name !== 'Project Summary') workbook.removeWorksheet(worksheet.id);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

