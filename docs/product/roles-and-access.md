# Roles and access

A person has one account and any number of global roles. Project access is a separate membership. Signing in does not grant either.

## Sign-in

| Path | When it is used | What it proves |
| --- | --- | --- |
| Google | The normal button on the sign-in screen, whenever Google is configured | The email is this Google account |
| Email and password | Automated tests, the seeded break-glass admin, and any environment where Google is not configured | The local password matches |

Both paths create the same session: user id, global roles, permission keys, and memberships. The API allows the browser origin that the product is actually served from, including both `localhost` and `127.0.0.1` in local development.

Rules:

- An unknown Google email is refused. An admin invites the person first, or turns on a named domain only when Super Admin has set that policy.
- The invite stores the email. The first Google sign-in attaches the identity to that user. It does not add roles.
- Local passwords are off for invited Google users once Google is configured, except for accounts marked local-only (tests and break-glass).
- The seed password is not a product default. Production refuses to boot when the break-glass password is still the development fallback.
- Super Admin can configure the Google client and can disable Google. Admin cannot read that secret.

## Two layers

**Global roles** answer "what kind of work does this person do across the company?"

**Project membership** answers "what may they do on this project?"

Jira splits the same way: site-wide permissions are small and trusted; a project role is filled per project, so the same job title does not open every project. [Jira permissions](https://www.atlassian.com/software/jira/guides/permissions/overview) describe global permissions, space permissions, and space roles. We keep that split and skip Jira's third layer (per-item security schemes) until a real case needs it.

Effective access is the union of global roles, then intersected with customer ownership, program scope, and project membership.

## Global roles

A user may have several. Example: a customer-success manager who is also the lead on one implementation.

| Role | Held by | Opens | Does not open |
| --- | --- | --- | --- |
| Super Admin | One or two operators | Sign-in settings, every other admin power | Nothing by policy. Still recorded in the audit log |
| Admin | The people who run the company workspace | People, roles, customers, projects, programs | Google client secret. Not an automatic project lead |
| Program Manager | Someone responsible for a set of projects | Those projects, their customers, program health | Projects outside the program |
| Project Manager | Someone whose job is running projects | The projects where they are a member. Creating a project makes them its lead | Every project in the company |
| Customer Success Manager | The post-sale owner | Customers they own, linked project health, commitments | Internal RAID, the plan editor, other owners' books |
| Executive | A reader of the company | Programs and project health, read only | Edit, user admin, customer notes marked internal to CS |
| Sales | The person who owns the relationship before and around the contract | Customers, commercial fields, a request to open a project | Delivery editing, internal RAID, other sellers' private notes |

There is no global Team Member role. A contributor is a project membership. A person with no global role can still work on the projects where they are invited.

## Project membership

| Membership | Who | Powers inside that project |
| --- | --- | --- |
| Lead | The project manager, or a lead assigned on this project | The same project powers as a Project Manager: plan, board, team, dates, status |
| Contributor | Someone doing the work | Today, own work items, comments, status on assigned items |
| Viewer | A stakeholder who should see the project | Read overview, plan, and board. No internal RAID |

Assigning Lead is how "a lead gets project-manager access without a global title" works. The global Project Manager role does not replace the assignment. A Program Manager does not need a Lead row on every project inside the program; program scope already covers them. They still appear as the program owner, not as every project's lead.

## Customer scope

| Person | Customers they see |
| --- | --- |
| Super Admin, Admin | All |
| Program Manager | Customers linked to projects in their program |
| Customer Success Manager | Customers they own, plus any an admin shares |
| Sales | Customers they own, plus any an admin shares |
| Executive | All, commercial summary only |
| Project Lead or Contributor | The customer on their project, delivery context only. Not the CS book and not the sales notes |

Sharing a customer adds a named person. It does not copy the row.

## Menu permission, not a role-name switch

Screens check permission keys returned with the session. Roles grant those keys. The current `CUSTOMER` string check in the UI goes away in the identity milestone. New keys, granted only by the roles above:

| Key | Granted to | Gates |
| --- | --- | --- |
| `work.update` | Lead and Contributor membership, Project Manager, Program Manager, Admin, Super Admin | Today |
| `project.lead` | Lead membership, Program Manager on their projects, Admin, Super Admin | Plan editing, team editing |
| `customer.read` | Sales, Customer Success, Program Manager, Executive, Admin, Super Admin, plus delivery members for their own customer | Customers list, scoped |
| `customer.manage` | Sales, Customer Success, Admin, Super Admin | Create and edit commercial fields they are allowed to see |
| `customer_success.view` | Customer Success Manager, Admin, Super Admin | Success tab and the Customer Success section |
| `program.view` | Program Manager, Executive, Admin, Super Admin | Programs |
| `user.manage` | Admin, Super Admin | People |
| `auth.configure` | Super Admin | Google and local-login policy |

`raid.read` is not granted to Sales, Customer Success, Executive, or any external viewer. Removing it from the current Customer and Partner seed grants is part of the identity milestone, even though the RAID screens leave the sidebar in the shell milestone.

## External customers

Not a milestone until the wall is real. They are viewers on named projects, with no global internal role, no customer book, and no RAID. Do not invite them before that milestone.

## Worked examples

**Asha, Project Manager and Lead on CapGemini.** She lands on Today. She sees CapGemini. She does not see another program's projects. She has no Customers item unless she is also Sales or Customer Success.

**Ben, Customer Success Manager, and Lead on the same implementation.** He sees Customers and Today. On CapGemini he can edit the plan. On other projects he sees health only. He does not see internal risks.

**Chi, Executive only.** She lands on Programs. Counts match Today. She cannot edit.

**Dev, Contributor on one project, no global role.** Today shows assigned work. The sidebar has Today and that project. No People, no Customers.

**Super Admin.** Lands on Today if they also hold delivery membership, which the seed account should, so the operator is not dropped on a scorecard. People and Sign-in are in Administration.
