# Feature Progress

This document tracks the architecture-first lifecycle status for active and planned features.

Update this file whenever a stage is completed. The tracker should reflect the latest approved status before work moves to the next lifecycle stage.

## Lifecycle Tracker

| Feature | Requirements | Investigation | Gap Analysis | ADR | ADD | Technical Review | Architecture Commit | Implementation | Implementation Review | Testing | Docker | Ubuntu | Docs | Feature Commit | Status |
| ------- | ------------ | ------------- | ------------ | --- | --- | ---------------- | ------------------- | -------------- | --------------------- | ------- | ------ | ------ | ---- | -------------- | ------ |
| Feature 1.2.1 – Enterprise Resource Management Foundation | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Pending | Awaiting Feature Commit |
| Feature 1.2.2 – Resource CRUD API | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Pending | Completed (Pending Feature Commit) |
| Feature 1.2.3 – Resource Assignment | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Completed (Stage 13 approved) |
| Feature 1.2.4 – Skills Management | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Completed |
| Feature 1.2.5 – Resource Availability & Capacity Management | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Pending | Complete | Pending | Stage 11 Complete (Ready for Stage 12) |
| Feature 1.2.6 – Calendar Assignment | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Pending | Complete | Pending | Completed (Stage 13 approved; pending feature commit) |

## Stage Guidance

- `Requirements`: Product requirements and scope are reviewed.
- `Investigation`: Repository investigation is complete and documented.
- `Gap Analysis`: Current-state gaps are documented.
- `ADR`: ADR review and any required ADR creation are complete.
- `ADD`: Architecture Design Document is complete.
- `Technical Review`: Technical Design Review is complete.
- `Architecture Commit`: Stage 7.5 baseline commit has been created with architecture artefacts only.
- `Implementation`: Code implementation has started or completed.
- `Implementation Review`: Implementation review is complete.
- `Testing`: Required tests and builds are complete.
- `Docker`: Docker build and Compose health verification are complete.
- `Ubuntu`: Ubuntu deployment compatibility is verified.
- `Docs`: Documentation updates are complete.
- `Feature Commit`: Final single feature commit has been created.

## Update Rules

- Update this tracker at the end of every completed lifecycle stage.
- Do not mark `Implementation` as started until Technical Design Review and Architecture Baseline Commit are complete.
- Keep status values concise: `Not Started`, `In Progress`, `Pending`, `Complete`, `Blocked`, or a similarly clear value.
- Link detailed artefacts from the feature's product, architecture, ADR, or roadmap documents rather than duplicating them here.

## Implementation Note

The persistence foundation for Feature 1.2.5 (Stage 4.1) was committed together with the final Feature 1.2.4 Skills Management commit (0c0bef2) because both features were developed concurrently.

Stage 4.2 Domain Foundation was completed in commit dfee845.

Subsequent implementation stages follow the documented governance sequence.
