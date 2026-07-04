Planning Toolbar v1.0
Purpose

The Planning Toolbar is the primary command surface for schedule creation, editing, visualization, and analysis.

It should follow the same philosophy as Microsoft Project and Primavera:

Commands grouped by responsibility.
Minimal clicks.
Frequently used commands always visible.
Advanced features appear as they become available.
Toolbar Layout
+-----------------------------------------------------------------------------------------------+
| Create | WBS | Dependencies | Timeline | View | Analysis | Export | Help |
+-----------------------------------------------------------------------------------------------+
Group 1 — Create

Always visible.

Add ▼

• Task
• Summary
• Milestone
    • Standard
    • Release
    • Drop
    • Go Live
    • Decision

Add Child ▼

Rules:

Enabled only when Summary selected.
Creates child beneath selected Summary.
Keeps Summary selected after creation.
Group 2 — WBS
Indent

Outdent

Expand All

Collapse All

Future:

Renumber WBS
Group 3 — Dependencies
Link

Unlink

Future:

Dependency Inspector
Group 4 — Timeline
Today

Fit

Zoom +

Zoom –

Date Scale

Future:

Timescale

Daily

Weekly

Monthly

Quarterly

Yearly

Group 5 — View
Columns

Filters

View ▼

Views

Grid + Timeline

Grid Only

Timeline Only

Future

Resource View

Baseline View

Critical Path View
Group 6 — Analysis

Initially disabled.

Critical Path

Baseline

Calendar

Resource Leveling

Display:

Coming in Future Release

until implemented.

Group 7 — Export

Initially disabled.

Export ▼

Excel (.xlsx)

CSV

PDF

Microsoft Project XML

JSON

Future

Primavera XER
Group 8 — Help
Keyboard Shortcuts

Planning Guide

About Planning Engine
Keyboard Shortcuts

Document:

Delete

F2 Rename

Ctrl+D Duplicate

Ctrl+L Link

Ctrl+Shift+L Unlink

Ctrl++ Zoom In

Ctrl+- Zoom Out

Home Today

Ctrl+F Filter
Responsive Behaviour

Laptop

Collapse less-used groups into:

More ▼

Desktop

Show all groups.

Large Monitor

Everything visible.

Design Principles
Frequently used commands require one click.
Related commands stay together.
Disabled future features remain visible with "Coming in Future Release."
Toolbar order should remain stable between releases.
No duplicate commands elsewhere in the Planning Workspace.
Every command has a tooltip and keyboard shortcut where appropriate.
Future Roadmap

v1.0

Create
WBS
Dependencies
Timeline
View

v1.1

Critical Path
Baselines

v1.2

Calendars
Resource Leveling

v1.3

Export
MS Project XML
AI Schedule Advisor