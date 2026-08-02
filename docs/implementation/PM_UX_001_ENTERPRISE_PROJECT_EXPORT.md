# PM-UX-001 Enterprise Project Export Framework

## Repository Investigation

Project visibility and project detail loading are centralized in `ProjectsService`. Its project detail query includes the project owner, members, task assignees, and RAID registers. Project tasks are loaded through `findProjectTasks`, which applies the existing visibility check and attaches the latest execution update. Documents are loaded through `DocumentsService.findProjectDocuments`. Task dependency and execution-history entities are project/task scoped and are read directly by the export service for complete workbook history.

The calendar domain currently models organization calendars, holidays, and exceptions rather than project events. It is therefore not included in this project export; adding unrelated organization calendar rows would violate project scoping.

## Architecture

`ProjectExportController` is a thin, authenticated download endpoint. `ProjectExportService` assembles authorized project data and selects a provider by format. `ExcelExportProvider` owns workbook metadata and delegates individual sheets to `ExcelWorksheetBuilder` implementations. Future PDF, CSV, or PowerPoint providers can implement `ProjectExportProvider` without changing the project data contract or controller.

## Workbook Design

The workbook includes `Project Summary` and `KPIs`, plus `Project Tasks`, `Milestones`, `Dependencies`, `RAID Register`, `Team Members`, `Documents`, and `Execution History` only when those datasets contain rows. Every tabular sheet has a frozen header, auto-filter, styled header row, bounded auto-sized columns, date formatting, and print layout settings.

## Authorization

The endpoint requires `project.read`. Before any export data is assembled, `ProjectsService.findOne` and `findProjectTasks` verify that the requesting actor can view the project. Documents are requested only for that already-authorized project. No portfolio, bulk, scheduled, or cross-project export is exposed.

## Files Changed

- `backend/src/modules/project-export/` adds the provider contract, Excel provider, worksheet builders, service, controller, module, and tests.
- `backend/src/app.module.ts` registers the export module.
- `backend/package.json` and `backend/package-lock.json` add `exceljs`.
- `frontend/lib/api/client.ts` adds the authenticated workbook download helper.
- `frontend/components/project/project-header.tsx` adds the existing workspace Export Excel action.

## Testing

The Excel provider tests verify workbook generation, worksheet omission for missing data, frozen headers, and auto-filter formatting. Backend and frontend production builds pass. The export endpoint reuses the existing permission guards and project visibility tests rather than adding a second authorization model.

## Future Extensions

Add provider implementations for PDF, CSV, and PowerPoint against `ProjectExportData`; add project calendar-event data when the domain has a project-scoped event relation; and add streamed or asynchronous export handling if workbook sizes require it.

