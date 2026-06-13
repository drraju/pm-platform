# PM Platform Architecture Overview

Version: v1.0.5.9.1.1
Status: Enterprise Foundation Complete
Date: June 2026

---

# 1. Executive Summary

PM Platform is a self-hosted enterprise Project, Program and Portfolio Management (PPM) platform inspired by Monday.com, ClickUp, Jira and Planview.

The platform currently supports:

* Authentication & Authorization
* Role-Based Access Control (RBAC)
* Project Management
* Project Team Management
* Task Management
* RAID Management

  * Risks
  * Issues
  * Assumptions
  * Dependencies
* Portfolio Reporting
* Executive Dashboard
* Customer / Partner Visibility Controls
* Governance Ownership Model

Current maturity:

* Core PM Operations: Complete
* Security Model: Complete
* Portfolio Reporting: Complete
* Executive Reporting: Complete
* Planning Engine: Pending
* Resource Management: Pending

---

# 2. High-Level Architecture

```text
┌──────────────────────────────────────────────┐
│                 Users                        │
├──────────────────────────────────────────────┤
│ Program Manager                              │
│ Project Manager                              │
│ Delivery Lead                                │
│ Team Member                                  │
│ Executive                                    │
│ Customer                                     │
│ Partner                                      │
│ Admin                                        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             Next.js Frontend                 │
├──────────────────────────────────────────────┤
│ Dashboard                                    │
│ Projects                                     │
│ Tasks                                        │
│ RAID                                         │
│ Portfolio                                    │
│ Executive Dashboard                          │
│ User Administration                          │
└──────────────────────┬───────────────────────┘
                       │ REST API
                       ▼
┌──────────────────────────────────────────────┐
│             NestJS Backend                   │
├──────────────────────────────────────────────┤
│ Auth Module                                  │
│ Users Module                                 │
│ Projects Module                              │
│ Tasks Module                                 │
│ RAID Module                                  │
│ Risks Module                                 │
│ Dashboard Module                             │
│ Portfolio Module                             │
│ Notifications Module                         │
│ Integrations Module                          │
└──────────────────────┬───────────────────────┘
                       │
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼

 PostgreSQL        Redis         MinIO
 Database          Cache         Documents

```

---

# 3. Authorization Architecture

## Previous Design

```text
PermissionsGuard
    ↓
Role Repository
    ↓
Feature Module
```

Issues:

* Module dependency leakage
* Runtime repository failures
* Difficult to maintain

---

## Current Design

```text
PermissionsGuard
       │
       ▼
AuthorizationPolicyService
       │
       ▼
AuthzModule
       │
       ▼
Role Repository
       │
       ▼
Permission Evaluation
```

Benefits:

* Centralized authorization
* Reusable policies
* No feature-module dependency leakage
* Easier testing
* Enterprise scalability

---

# 4. User Roles

## Administrative

### SUPER_ADMIN

Full system access

### Admin

Platform administration

---

## Delivery Organisation

### Program Manager

* Full project control
* Team management
* Portfolio visibility
* Executive reporting access

### Project Manager

* Full project ownership
* Team management
* Task management
* RAID management

### Delivery Lead

* Assigned project management
* Task management
* RAID updates

### Team Member

* Assigned tasks
* Own RAID updates

---

## External Roles

### Customer

* Assigned projects only
* Read-only access

### Partner

* Assigned projects only
* Read-only access

---

## Executive

* Executive dashboard
* Portfolio reporting
* Read-only visibility

---

# 5. Core Functional Domains

## Project Management

Current Features

* Create Project
* Edit Project
* Delete Project
* Project Health
* Ownership
* Governance

Governance Fields

* Project Owner
* Business Owner
* Executive Sponsor
* Delivery Lead

---

## Team Management

Capabilities

* Add Member
* Remove Member
* Change Role

Membership Roles

* Owner
* Manager
* Contributor
* Viewer

---

## Task Management

Current Features

* Create Task
* Update Task
* Delete Task
* Reassign Task
* Status Tracking

Task Fields

* Title
* Description
* Assignee
* Priority
* Status
* Due Date
* Remarks
* Percent Complete

Planned

* Dependencies
* Milestones
* Baselines
* Estimates
* Parent Tasks

---

## RAID Management

### Risks

* Create
* Update
* Delete

### Issues

* Create
* Update
* Delete

### Assumptions

* Create
* Update
* Delete

### Dependencies

* Create
* Update
* Delete

Planned

* Comments
* History
* Audit Trail
* Soft Delete

---

# 6. Portfolio Management

Portfolio Summary

* Total Projects
* Active Projects
* At Risk Projects
* Delayed Projects

Cross-Project Visibility

* Program Managers
* Portfolio Managers
* Executives

---

# 7. Executive Dashboard

Provides:

* Portfolio Health
* Delivery Metrics
* Risk Exposure
* Project Status Summary
* Executive Reporting

Read-only access.

---

# 8. Database Architecture

Core Tables

```text
users
roles
permissions
role_permissions

projects
project_members

tasks

risks
issues
assumptions
dependencies

notifications
```

Governance Extensions

```text
projects.business_owner_id
projects.executive_sponsor_id
projects.delivery_lead_id
```

---

# 9. API Architecture

Pattern

```text
Frontend
    ↓
API Client
    ↓
NestJS Controller
    ↓
Service Layer
    ↓
AuthorizationPolicyService
    ↓
Repository Layer
    ↓
PostgreSQL
```

Example

```text
Projects Page
    ↓
GET /projects
    ↓
ProjectsController
    ↓
ProjectsService
    ↓
ProjectVisibilityService
    ↓
AuthorizationPolicyService
```

---

# 10. Current Release Timeline

```text
v1.0.0  MVP Foundation

v1.0.5
  Project Teams
  Task Operations

v1.0.5.1
  Authorization Alignment

v1.0.5.2
  Authorization Hardening

v1.0.5.3
  Project Visibility

v1.0.5.4
  Visibility Corrections

v1.0.5.5
  RAID Visibility Hardening

v1.0.5.6
  Executive Dashboard

v1.0.5.7
  RAID Management UI

v1.0.5.9.1
  Authorization Policy Framework

v1.0.5.9.1.1
  Centralized Authz Module
```

---

# 11. Known Technical Debt

Medium Priority

* Modal usability framework
* Automatic migration execution
* Health checks
* Deployment hardening

Low Priority

* N+1 project enrichment queries
* Policy caching
* Audit event framework

---

# 12. Roadmap

## v1.0.5.9.2

Platform Hardening

* Modal framework
* Deployment hardening
* RAID audit trail
* Health checks

---

## v1.0.6

Task Planning Foundation

* Dependencies
* Milestones
* Baselines
* Estimates
* Task Hierarchy

---

## v1.0.7

Timeline & Gantt

---

## v1.0.8

Program Management

---

## v1.0.9

Portfolio Hierarchy

---

## v1.1.0

Resource Capacity Planning

---

## v1.2.0

PMO Analytics & Executive Reporting

```
```
