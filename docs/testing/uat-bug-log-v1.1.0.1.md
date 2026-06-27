| Area                      | Status                                       |
| ------------------------- | -------------------------------------------- |
| Navigation                | ✅ Good                                       |
| Rendering                 | ✅ Good                                       |
| Initial Schedule Creation | ✅ Good                                       |
| Gantt Display             | ✅ Good                                       |
| Task CRUD                 | ❌ Missing                                    |
| Schedule Editing          | ❌ Missing                                    |
| Dependency Management     | ⚠️ UI present, backend authorization failing |
| Save Operations           | ❌ Incomplete                                 |
| Toolbar                   | ❌ Incomplete                                 |
| WBS Management            | ❌ Missing                                    |

| ID          | Module              | Severity | Status | Description                                                                                                                  |
| ----------- | ------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| UAT-001     | Planning            | High     | Open   | Dragging/resizing a task attempts a PATCH request to a backend endpoint that does not exist (404).                           | Closed
| UAT-002     | Planning            | High     | Open   | Planning Workspace is read-only. No inline editing of task properties.                                                       |
| UAT-003     | Planning            | Medium   | Open   | Zoom controls are missing. Browser zoom breaks the layout instead of scaling the timeline.                                   |
| UAT-004     | Planning            | Medium   | Open   | Expand/Collapse controls for WBS/summary tasks are missing.                                                                  |
| UAT-005     | Planning / Security | High     | Open   | Project Manager user receives "Project manager access is required" when adding dependencies. Authorization is incorrect.     |
| **UAT-006** | Planning            | **High** | Open   | No **Add Task** button or mechanism exists within the Planning Workspace. Users cannot create tasks directly while planning. |
