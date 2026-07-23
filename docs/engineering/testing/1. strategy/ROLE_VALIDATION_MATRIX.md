
| Functionality | SuperAdmin | Admin | Program Manager | Portfolio Manager | Project Manager | Delivery Lead | Team Member | Executive | Customer | Partner |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Projects** | CRUD | CRUD | RU | R | RU | R | R | R | R | R |
| **Tasks** | CRUD | CRUD | CRUD | RU | CRUD | CRUD | RU | R | R | R |
| **RAID** | CRUD | CRUD | CRUD | R | CRUD | CRUD | RU | R | R | R |
| **Portfolio** | CRUD | CRUD | RU | R | - | - | - | R | - | - |
| **Executive** | CRUD | CRUD | R | R | - | - | - | R | - | - |
| **Users** | CRUD | CRUD | R | - | R | - | - | - | - | - |



| Role | Projects | Tasks | RAID | Portfolio | Executive | Users |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SuperAdmin** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| **Admin** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| **Program Manager** | ⚠️ RU | ✅ CRUD | ✅ CRUD | ⚠️ RU | ⚠️ R | ⚠️ R |
| **Portfolio Manager** | ⚠️ R | ⚠️ RU | ⚠️ R | ⚠️ R | ⚠️ R | ❌ No Access |
| **Project Manager** | ⚠️ RU | ✅ CRUD | ✅ CRUD | ❌ No Access | ❌ No Access | ⚠️ R |
| **Delivery Lead** | ⚠️ R | ✅ CRUD | ✅ CRUD | ❌ No Access | ❌ No Access | ❌ No Access |
| **Team Member** | ⚠️ R | ⚠️ RU | ⚠️ RU | ❌ No Access | ❌ No Access | ❌ No Access |
| **Executive** | ⚠️ R | ⚠️ R | ⚠️ R | ⚠️ R | ⚠️ R | ❌ No Access |
| **Customer** | ⚠️ R | ⚠️ R | ⚠️ R | ❌ No Access | ❌ No Access | ❌ No Access |
| **Partner** | ⚠️ R | ⚠️ R | ⚠️ R | ❌ No Access | ❌ No Access | ❌ No Access |

## Dashboard Default Landing

| Role | Default Landing | Expected Drilldown Scope |
| :--- | :--- | :--- |
| **SuperAdmin** | `/dashboard` | User-scoped dashboard widgets unless a portfolio/executive page is opened explicitly |
| **Admin** | `/dashboard` | User-scoped dashboard widgets unless a portfolio/executive page is opened explicitly |
| **Program Manager** | `/dashboard` | User dashboard plus global portfolio and executive pages when chosen |
| **Portfolio Manager** | `/portfolio` | Global portfolio-visible datasets |
| **Project Manager** | `/dashboard` | User-scoped dashboard widgets |
| **Delivery Lead** | `/dashboard` | User-scoped dashboard widgets |
| **Team Member** | `/dashboard` | User-scoped dashboard widgets |
| **Executive** | `/executive` | Global executive-visible datasets |
| **Customer** | `/dashboard` | User-scoped dashboard widgets |
| **Partner** | `/dashboard` | User-scoped dashboard widgets |

## Executive Drilldown Expectations

| Widget | URL Contract | Result Expectation |
| :--- | :--- | :--- |
| **Green Projects** | `/projects?health=GREEN&sort=health_asc` | Project list count matches green project widget total |
| **Amber Projects** | `/projects?health=AMBER&sort=health_desc` | Project list count matches amber project widget total |
| **Red Projects** | `/projects?health=RED&sort=health_desc` | Project list count matches red project widget total |
| **Open Risks** | `/risks?status=open` | Visible risks exclude closed/resolved items and match widget total |
| **Open Issues** | `/issues?status=open` | Visible issues exclude closed/resolved items and match widget total |
| **Overdue Tasks** | `/tasks?scope=all&timing=overdue` | Visible overdue tasks use date-only comparison and match widget total |

Notes:
- `Engineer` and `QA Engineer` follow the same runtime navigation and task-update expectations as the `Team Member` contributor experience.
- Enterprise planning UI uses `Phase` as the end-user label for `summary` tasks; role expectations do not change with this terminology update.
- Executive and portfolio dashboard drilldowns are expected to preserve their active filter state through URL parameters so refresh and deep-link behavior stay consistent.
