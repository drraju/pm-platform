
# PM Platform Documentation

PM Platform is an enterprise Project, Portfolio, Delivery, Resource and Customer Success Management Platform designed for modern enterprises.

This documentation is the primary source of truth for product vision, architecture, engineering practices, deployment and user guidance.

---

# Documentation Structure

| Area | Purpose |
|------|---------|
| Vision | Product vision, strategy and guiding principles |
| Roadmap | Product planning and release planning |
| Product | Requirements, epics and feature specifications |
| Architecture | Platform architecture and ADRs |
| Engineering | Development, testing, deployment and build guidance |
| User Guide | End-user and administrator documentation |
| Operations | Releases, upgrades and troubleshooting |

---

# Quick Navigation

## Vision

- PRODUCT_VISION
- PRODUCT_STRATEGY
- PLATFORM_PRINCIPLES
- DESIGN_PRINCIPLES

Location:

docs/vision/

---

## Architecture

- Architecture
- Architecture Index
- ADR Index
- Build Playbook

---

## Product

- Feature Progress
- Product Backlog
- Release Plan

---

## API

- API Design Standard
- API Guidelines
- Enterprise Dependency API
- [External API v1 Consumer Guide](api/external-v1.md)

---

## Engineering

- Development
- Testing
- Deployment
- Docker
- Installation

---

## Releases

- Release Notes

---

# Recommended Reading

## Product Managers

1. PRODUCT_VISION
2. PRODUCT_STRATEGY
3. Product Backlog
4. Release Plan

---

## Architects

1. PRODUCT_VISION
2. PLATFORM_PRINCIPLES
3. Architecture
4. ADRs

---

## Developers

1. Build Playbook
2. Architecture
3. ADRs
4. Feature Specification

---

## QA

1. Feature Specification
2. Testing
3. Release Notes

---

# Development Lifecycle

All major functionality follows the stage-gated engineering process:

Requirements
→ Investigation
→ Architecture
→ Design
→ Implementation
→ Verification
→ Testing
→ Documentation
→ Release

---

# Documentation Governance

Before implementing a major feature:

- Verify alignment with PRODUCT_VISION.
- Review PLATFORM_PRINCIPLES.
- Review relevant ADRs.
- Determine whether a new ADR is required.
- Update documentation alongside implementation.


## OLD README.md content. Will be merged or removed later

# PM Platform Documentation

PM Platform is an enterprise project management platform for managing projects,
planning schedules, tracking RAID items, visualizing portfolio health, and
supporting delivery governance across teams.

This document is the entry point for all project documentation.

## Documentation Structure

Use this index to navigate architecture notes, architecture decision records,
deployment guidance, API documentation, and release notes.

## Architecture

- [Architecture](ARCHITECTURE.md)
- [Architecture Index](architecture/README.md)
- [Build Playbook](BUILD_PLAYBOOK.md)
- [Feature Progress](FEATURE_PROGRESS.md)
- [Feature 1.3.1 Summary](features/FEATURE_1_3_1_SUMMARY.md)
- [Feature 1.3.2 Completion Report](features/FEATURE_1_3_2_SUMMARY.md)

## Architecture Decision Records (ADR)

- [ADR-001: Scheduling Engine Architecture](adr/ADR-001-scheduling-engine.md)
- [ADR-002: Planning Engine](adr/ADR-002-planning-engine.md)
- [ADR-003: WBS Model](adr/ADR-003-wbs-model.md)
- [ADR-004: Project Workspace](adr/ADR-004-project-workspace.md)
- [ADR-005: Scheduling Authority](adr/ADR-005-scheduling-authority.md)
- [ADR-006: Summary Task Semantics](adr/ADR-006-summary-task-semantics.md)
- [ADR-007: Milestone Categories](adr/ADR-007-milestone-categories.md)
- [ADR-008: ScheduleAnalysis Model](adr/ADR-008-schedule-analysis-model.md)
- [ADR-009: Dependency Validation](adr/ADR-009-dependency-validation.md)
- ADR-010: Placeholder

## Deployment

- [Deployment](DEPLOYMENT.md)

## API

- [REST API Design Standard](architecture/API_DESIGN_STANDARD.md)
- [API Guidelines](development/api-guidelines.md)
- [Enterprise Dependency API](api/enterprise-dependencies.md)
- [External API v1 Consumer Guide](api/external-v1.md)
- [Technical Debt Register](development/TECHNICAL_DEBT.md)

## Release Notes

- [Release Notes](releases/README.md)
