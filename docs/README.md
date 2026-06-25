# Documentation Index

## Purpose

This index is the entry point for PM Platform engineering, product, release, and user documentation.

## Scope

It covers the initial documentation framework for the enterprise project management platform and links to every document in the maintained framework.

## Audience

Engineering, product management, QA, deployment owners, PMO stakeholders, and implementation teams.

## Overview

PM Platform documentation is organized by reader intent: getting started, user guidance, architecture, development practices, release history, and product direction. Each document follows a common structure so new contributors can quickly find purpose, scope, audience, related documents, and revision history.

## Contents

### Getting Started

| Document | Description |
| --- | --- |
| [Root README](../README.md) | Repository-level overview with stack summary and a pointer into this documentation index. |
| [Deployment Workflow](development/deployment.md) | Environment, Docker Compose, database, and release deployment workflow for local and controlled environments. |
| [Testing Strategy](development/testing.md) | Test layers, commands, responsibilities, and expectations for backend and frontend quality gates. |

### User Guides

| Document | Description |
| --- | --- |
| [Project Management](user-guide/project-management.md) | Outline for creating, managing, and tracking projects, team membership, work items, and project health. |
| [Planning Workspace](user-guide/planning-workspace.md) | Outline for using schedule planning, Gantt visualization, dependencies, critical path indicators, and resource overlays. |
| [Portfolio Dashboard](user-guide/portfolio-dashboard.md) | Outline for executive and portfolio views, health signals, milestones, and drilldowns. |
| [RAID Management](user-guide/raid-management.md) | Outline for risk, assumption, issue, and dependency register workflows. |

### Architecture

| Document | Description |
| --- | --- |
| [System Architecture](architecture/system-architecture.md) | End-to-end architecture, repository layout, runtime components, data flow, and deployment view. |
| [Backend Architecture](architecture/backend.md) | NestJS module structure, API boundaries, persistence model, authorization, and backend responsibilities. |
| [Frontend Architecture](architecture/frontend.md) | Next.js application layout, feature organization, API client usage, state patterns, and UI concerns. |
| [Planning Engine Roadmap](architecture/planning-engine-roadmap.md) | Roadmap for moving from planning workspace foundations to an enterprise scheduling engine. |
| [v1.1.0 Planning Workspace](architecture/v1.1.0-planning-workspace.md) | Architecture notes for the snapshot-backed planning workspace and Gantt experience. |
| [v1.1.1 Planning Engine](architecture/v1.1.1-planning-engine.md) | Stabilization architecture for dependency validation, critical path correctness, transactions, and resource calculations. |

### Development

| Document | Description |
| --- | --- |
| [Branching Strategy](development/branching-strategy.md) | Branch model, naming rules, merge expectations, release branches, and hotfix handling. |
| [Coding Standards](development/coding-standards.md) | TypeScript, NestJS, Next.js, clean architecture, validation, testing, and documentation standards. |
| [Deployment Workflow](development/deployment.md) | Deployment workflow for Docker Compose, PostgreSQL schema changes, environment variables, and release verification. |
| [Testing Strategy](development/testing.md) | Unit, integration, component, accessibility, regression, and release validation guidance. |

### Releases

| Document | Description |
| --- | --- |
| [v1.0.6](releases/v1.0.6.md) | Summary of the planning foundation milestone, including hierarchy, dependencies, baselines, and usability improvements. |
| [v1.1.1 Planning Engine Stabilization](releases/v1.1.1-planning-engine-stabilization.md) | Planned stabilization release for scheduling correctness, data integrity, performance, and resource readiness. |

### Product

| Document | Description |
| --- | --- |
| [Vision](product/vision.md) | Product vision, mission, target users, value proposition, and long-term platform goals. |
| [Feature Matrix](product/feature-matrix.md) | Capability matrix across project management, planning, RAID, dashboards, integrations, and enterprise governance. |
| [Product Roadmap](product/product-roadmap.md) | Release roadmap from current planning foundations through resource management and portfolio planning. |

## Related Documents

- [System Architecture](architecture/system-architecture.md)
- [Product Roadmap](product/product-roadmap.md)
- [Testing Strategy](development/testing.md)
- [v1.1.1 Planning Engine Stabilization](releases/v1.1.1-planning-engine-stabilization.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created documentation framework index and cross-reference map. |
