# PM Platform Engineering Manual

Engineering Governance Version: 1.0

Status: Frozen

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the authoritative engineering workflow, governance hierarchy, and cross-document navigation model for PM Platform.

This document is the single entry point for engineering governance within PM Platform.

Every developer and AI assistant should begin here before contributing to the project.

---

Engineering decisions must follow this precedence order:

1. ENGINEERING_MANUAL.md
2. Architecture Decision Records (ADRs)
3. AI_DEVELOPMENT_PLAYBOOK.md
4. FEATURE_IMPLEMENTATION_TEMPLATE.md
5. QUALITY_GATES.md
6. DEFINITION_OF_DONE.md
7. CODE_REVIEW_CHECKLIST.md
8. CODING_STANDARDS.md
9. Feature-specific documentation

If two documents appear to conflict,
the document higher in this hierarchy takes precedence.

If uncertainty remains,
create an ADR before implementation.

These principles are permanent.

• Architecture before implementation.

• Enterprise quality over speed.

• Simplicity over cleverness.

• Documentation is part of the product.

• Backward compatibility by default.

• AI is an engineering assistant.

• Every implementation is reviewable.

• Every feature leaves the platform better than it was before.

## 1. Purpose

This manual serves as the authoritative engineering guide for PM Platform.

Its objectives are:

- single source of engineering guidance
- consistent development practices
- architecture-first implementation
- enterprise-grade quality
- long-term maintainability
- AI-assisted engineering

The manual exists to make the engineering process explicit, repeatable, and reviewable across the full PM Platform lifecycle.

## 2. Engineering Philosophy

PM Platform engineering is guided by the following principles:

- architecture before implementation
- simplicity over complexity
- incremental development
- documentation is part of the product
- one source of truth
- enterprise quality
- AI assists rather than replaces engineering judgement

These principles apply to planning, implementation, testing, documentation, review, deployment, and ongoing maintenance.

## 3. Engineering Workflow

The following Stage model is the authoritative engineering lifecycle for PM Platform.

All other governance documents must reference this Stage model rather than redefining a competing lifecycle.

```text
Stage 0  Repository & Context Verification

Stage 1  Requirements Review

Stage 1.1 Documentation Alignment

Stage 2  Repository Investigation

Stage 3  Architecture & Design

Stage 3.5 ADR Review

Stage 4.1 Persistence

Stage 4.2 DTOs / Validation

Stage 4.5 Quality Gate

Stage 5  Application Service

Stage 6  API

Stage 7  Integration

Stage 8  Testing

Stage 9  Documentation

Stage 10 Final Review

Stage 11 Approval

Stage 12 Commit

Stage 13 Push
```

Stages must be completed sequentially and may not be skipped.

Where a feature does not require a specific implementation stage, that omission must be explicit and approved rather than assumed.

## 4. Engineering Governance Documents

The following documents define the current engineering governance baseline.

| Document | Purpose | Mandatory |
| -------- | ------- | --------- |
| [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md) | Defines the standard architecture-first development workflow, Stage guidance, and verification approach. | Yes |
| [FEATURE_IMPLEMENTATION_TEMPLATE.md](FEATURE_IMPLEMENTATION_TEMPLATE.md) | Provides the reusable template for planning and executing future features. | Yes |
| [QUALITY_GATES.md](QUALITY_GATES.md) | Defines the mandatory quality gates that every feature must pass before completion. | Yes |
| [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) | Defines when a stage, feature, epic, and release are truly complete. | Yes |
| [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md) | Defines the standard architecture-focused review checklist used for every code review. | Yes |
| [CODING_STANDARDS.md](CODING_STANDARDS.md) | Defines the mandatory PM Platform coding standards across engineering disciplines. | Yes |
| [REST API Design Standard](../architecture/API_DESIGN_STANDARD.md) | Defines canonical REST naming, pagination, sorting, filtering, public DTO, validation, error, Swagger, and compatibility rules. | Yes for API work |

These documents should be read together. This manual is the entry point, and the linked documents provide the detailed operating standards.

## 5. Architectural Invariants

The following rules are non-negotiable:

- controllers never contain business logic
- application services orchestrate workflows
- validation belongs in validation services
- repositories perform persistence only
- DTOs remain in the transport layer
- public API responses use transport DTOs and never expose entities or internal projections
- controllers never access repositories or calculate derived read-model state
- database migrations are additive
- architecture reviews are mandatory
- documentation updates are mandatory
- every feature preserves backward compatibility unless approved by ADR
- AI-generated code follows the same standards as handwritten code

These rules may only be changed through an approved ADR.

## 6. Engineering Standards

All features must comply with the current governance standards:

- [Coding Standards](CODING_STANDARDS.md)
- [Quality Gates](QUALITY_GATES.md)
- [Definition of Done](DEFINITION_OF_DONE.md)
- [Code Review Checklist](CODE_REVIEW_CHECKLIST.md)

Compliance with these documents is mandatory for implementation, review, verification, and approval.

## 7. Repository Standards

PM Platform uses a monorepo structure:

```text
backend/
frontend/
docs/
docker-compose.yml
```

Repository rules:

- there is no root `package.json`
- npm commands execute only within `backend/` or `frontend/`
- Docker Compose is executed from the repository root
- documentation is maintained under `docs/`

Repository structure must be understood before suggesting verification commands, build commands, or automated workflows.

## 8. Governance Versioning

Current governance baseline:

- Version `1.0`
- Status `Frozen`

Governance versioning rules:

- governance documents evolve independently of application features
- significant governance changes require review
- breaking governance changes should be recorded in an ADR or governance changelog

Governance versioning helps the project separate engineering process maturity from feature delivery progress.

## 9. Freeze Policy

The current engineering governance baseline is considered stable.

- governance documents are considered stable
- future governance changes require review
- significant governance changes require an ADR
- product development resumes under Governance v1.0

This freeze applies to the current governance model, not to the product roadmap. Feature and architecture work should continue using this frozen governance baseline until an approved governance revision replaces it.

## 10. Future Governance Roadmap

This section reserves space for future governance documents and standards expansion.

Future areas may include:

- architecture principles
- testing strategy
- branching strategy
- release management
- security standards
- observability standards
- AI development standards
- plugin development standards

These topics should be formalized through approved documentation rather than informal convention drift.

## 11. Conclusion

Engineering excellence is achieved through consistent application of these standards rather than isolated implementation quality.

PM Platform quality depends on disciplined architecture, deliberate review, clear documentation, and repeatable engineering behavior across every feature and release.

---

## Related Governance Documents

- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [FEATURE_IMPLEMENTATION_TEMPLATE.md](FEATURE_IMPLEMENTATION_TEMPLATE.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
