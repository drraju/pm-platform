# UI Guidelines

## Enterprise UI Principles

The PM Platform UI should be information-dense, predictable, accessible, and professional. It should resemble enterprise productivity tools such as Microsoft Project, Azure DevOps, Jira, Primavera, and ClickUp without becoming visually noisy.

## Spacing

- Use compact spacing for tables, grids, and workspaces.
- Avoid excessive whitespace in operational screens.
- Use clear section grouping and consistent padding.

## Typography

- Use readable text sizes for dense data.
- Reserve large headings for page-level identity.
- Use uppercase labels sparingly for table headers and metadata.

## Icons

Use familiar icons for common actions where available. Icons must have accessible labels or adjacent text when meaning is not obvious.

## Buttons

| Button Type | Use |
| --- | --- |
| Primary | Main creation or submit action |
| Secondary | Non-destructive actions |
| Destructive | Delete/remove actions |
| Icon | Dense toolbar actions |

## Tables

- Tables should support horizontal scroll on small screens.
- Columns should remain predictable.
- Inline editing should be consistent across Planning and Tasks.
- Empty states should explain the absence of data and the next action.

## Forms

- Validate early.
- Use clear labels.
- Avoid allowing impossible domain states.
- Prefer dropdowns for controlled values.

## Dialogs

Dialogs should be focused, keyboard accessible, and use sticky action footers where content can scroll.

## Navigation

Project-level tabs should preserve project context. Global navigation should separate dashboards, portfolio, projects, tasks, RAID, users, and administration.

## Toolbar Design

Toolbars should be grouped by workflow:

- Tasks.
- Schedule.
- Zoom.
- View.
- Help.

Toolbars in large workspaces should remain visible while workspace content scrolls.

## Responsive Behavior

- Desktop: full tables and split workspace views.
- Tablet: compact controls and horizontal scroll.
- Mobile: scrollable data regions and simplified actions.

## Accessibility

- All controls need accessible names.
- Keyboard support should be documented.
- Focus should move predictably after create/edit actions.
- Color must not be the only status signal.
