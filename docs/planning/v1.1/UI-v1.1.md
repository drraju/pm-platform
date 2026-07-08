# PM Platform v1.1 UI Plan

## Overview

v1.1 adds calendar, resource, baseline, and portfolio planning UI surfaces. The
UI should remain enterprise-focused: dense, scannable, predictable, and aligned
with existing Planning Workspace patterns.

## Navigation Changes

### App Navigation

Add:

- Resources
- Portfolio Planning

### Project Workspace Navigation

Add or expand:

- Planning > Baselines
- Planning > Resources
- Project Settings > Calendar

## Calendars

### Project Calendar Settings Screen

Wireframe:

```text
Project Settings
|-- General
|-- Team
|-- Calendar
    |-- Calendar selector
    |-- Working week grid
    |-- Holidays and exceptions table
    |-- Save / Archive actions
```

Controls:

- Calendar dropdown.
- Working day checkboxes.
- Start/end time inputs.
- Exception add/edit dialog.
- Assign calendar button.

### Calendar Exception Dialog

Fields:

- Name.
- Date.
- Exception type.
- Working hours override.
- Notes.

## Resources

### Resource List Screen

Wireframe:

```text
Resources
|-- Toolbar: Search, Role Filter, Status Filter, Add Resource
|-- Table: Name, Type, Role, Capacity, Calendar, Status
|-- Detail panel
```

Actions:

- Add resource.
- Edit resource.
- Archive resource.
- Open resource calendar.

### Resource Detail Screen

Sections:

- Profile.
- Calendar.
- Allocations.
- Utilization.
- History placeholder.

## Resource Views

### Resource Utilization View

Wireframe:

```text
Resource Utilization
|-- Date range selector
|-- Resource filters
|-- Capacity vs demand grid
|-- Over-allocation highlights
|-- Project/task drilldown drawer
```

Display:

- Resource rows.
- Time-period columns.
- Capacity hours.
- Allocated hours.
- Allocation percent.
- Overload indicators.

### Project Resource Allocation Panel

Location:

- Project Workspace > Planning > Resources.

Wireframe:

```text
Project Resources
|-- Allocations table
|-- Utilization summary
|-- Add allocation
|-- Over-allocation warnings
```

## Baselines

### Baseline Comparison In Planning Workspace

Add:

- Baseline selector in Planning toolbar or view menu.
- Optional baseline date columns.
- Variance columns.
- Variance badges.

Wireframe:

```text
Planning Workspace
|-- Toolbar: Baseline selector
|-- Grid columns:
    WBS
    Task Name
    Start
    Finish
    Baseline Start
    Baseline Finish
    Start Variance
    Finish Variance
|-- Timeline overlay: optional baseline markers
```

### Baseline Detail Dialog

Fields:

- Baseline name.
- Created date.
- Created by.
- Snapshot summary.
- Variance summary.

## Portfolio

### Portfolio Planning Dashboard

Wireframe:

```text
Portfolio Planning
|-- Schedule Health card
|-- Resource Pressure card
|-- Baseline Variance card
|-- Critical Milestones card
|-- Project drilldown table
```

Drilldowns:

- Schedule health by project.
- Resource overload by project/resource.
- Baseline variance by project.
- Milestone risk by project.

## Dialogs

Planned dialogs:

- Create Project Calendar.
- Add Calendar Exception.
- Create Resource.
- Edit Resource.
- Add Resource Calendar Exception.
- Add Resource Allocation.
- Edit Resource Allocation.
- Baseline Detail.
- Leveling Recommendation Detail.

## Menus

Planning Workspace additions:

- View menu option for baseline columns.
- View menu option for resource overlays.
- Row or toolbar access to allocation detail where appropriate.

Resource screens:

- Resource row action menu.
- Allocation row action menu.
- Calendar exception row action menu.

## Accessibility

- Tables and grids must expose row and column context.
- Over-allocation cannot rely on color alone.
- Dialogs must manage focus.
- All icon-only actions need accessible labels.
- Keyboard navigation should match existing Planning Workspace behavior.

## Responsive Behavior

- Planning Workspace remains desktop-first.
- Resource list and portfolio cards should remain usable on tablet widths.
- Dense grids may use horizontal scroll on smaller screens.
