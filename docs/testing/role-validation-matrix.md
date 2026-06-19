
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
