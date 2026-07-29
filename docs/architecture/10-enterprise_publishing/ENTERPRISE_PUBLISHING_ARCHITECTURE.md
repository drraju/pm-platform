# Enterprise Publishing Architecture

**Document Version:** 1.0  
**Status:** Draft (Architecture Approved)  
**Owner:** PM Platform Architecture Team  
**Last Updated:** 29 July 2026

---

# 1. Purpose

The Enterprise Publishing Platform provides a governed mechanism for distributing business data and derived intelligence from the PM Platform to enterprise consumers.

Rather than allowing downstream applications direct access to transactional databases or internal business services, the Publishing Platform exposes curated, versioned, secure, and auditable data through pluggable publication adapters.

The platform is provider-agnostic and supports multiple publication targets while maintaining a consistent publication lifecycle, governance model, and architecture.

---

# 2. Goals

The Publishing Platform is designed to:

- Publish business data without exposing transactional databases.
- Publish AI-generated intelligence as reusable enterprise assets.
- Support multiple publication targets.
- Maintain provider independence.
- Provide schema governance.
- Ensure publication traceability and auditability.
- Support event-driven and scheduled publishing.
- Enable enterprise-wide data reuse.

---

# 3. Non-Goals

The Publishing Platform is NOT responsible for:

- Owning business data.
- Executing business logic.
- Performing analytics.
- Acting as a reporting engine.
- Replacing the transactional database.
- Replacing the AI Platform.
- Replacing enterprise integration platforms.

---

# 4. Guiding Principles

## 4.1 System of Record

The PM Platform remains the authoritative system of record.

Transactional business data always resides within the PM Platform.

---

## 4.2 System of Distribution

The Publishing Platform distributes governed business data to enterprise consumers.

Published data must never become the authoritative source.

---

## 4.3 Provider Agnostic

Publication logic must never depend on a specific publishing technology.

Publishing targets are implemented through adapters.

---

## 4.4 Read-Only Distribution

Publishing never modifies transactional data.

The Publishing Platform only reads validated domain information.

---

## 4.5 Business Logic Separation

Business logic belongs inside domain services.

Publishers are responsible only for distribution.

---

## 4.6 Security First

Only authorized data may be published.

Sensitive information must be filtered before publication.

---

## 4.7 Versioned Schemas

Every published schema must be versioned.

Consumers should never depend on internal database structures.

---

# 5. High-Level Architecture

```
                    PM Platform
               Domain Services & APIs
                         │
                  Publication Pipeline
                         │
                 Publication Policies
                         │
                 Publisher Registry
                         │
                Publisher Adapter Layer
                         │
         ┌───────────────┼────────────────┐
         │               │                │
     Fabrix RDAF      Kafka         Future Targets
      PStreams
```

---

# 6. Core Components

## 6.1 Publication Pipeline

Responsibilities:

- Accept publication requests
- Validate requests
- Apply publication policies
- Transform domain objects
- Invoke publisher adapters
- Publish diagnostics
- Generate audit events

---

## 6.2 Publisher Registry

Responsibilities:

- Register publishers
- Resolve publishers
- Discover capabilities
- Maintain publisher metadata
- Support provider independence

---

## 6.3 Publication Policies

Responsibilities:

- Security
- Tenant isolation
- Publication authorization
- Publication scheduling
- Retry policies
- Filtering rules

---

## 6.4 Publisher Adapter

Responsibilities:

- Convert internal publication models
- Invoke target-specific APIs
- Normalize publication responses
- Normalize publication errors

Supported adapters include:

- Fabrix RDAF PStreams (MVP)
- Kafka (Future)
- Azure Event Hub (Future)
- Snowflake (Future)
- Data Lake (Future)

---

## 6.5 Schema Registry

Responsibilities:

- Schema versioning
- Compatibility validation
- Schema evolution
- Consumer compatibility

---

# 7. Publication Lifecycle

```
Business Event
      │
Publication Request
      │
Validation
      │
Transformation
      │
Policy Evaluation
      │
Publisher Resolution
      │
Publication
      │
Verification
      │
Audit
      │
Completed
```

---

# 8. Publication Types

## Snapshot

Publishes the complete state of an entity.

Examples:

- Project
- Portfolio
- Team

---

## Delta

Publishes only changed fields.

Examples:

- Task Status Updated
- Risk Severity Changed

---

## Event

Immutable business events.

Examples:

- Project Created
- Milestone Completed
- Risk Closed

---

## Intelligence

AI-generated information.

Examples:

- Executive Summary
- Delivery Forecast
- Health Score
- Capacity Forecast

---

# 9. Enterprise Data Taxonomy

The Publishing Platform supports the following enterprise domains:

- Projects
- Programs
- Portfolios
- Tasks
- Milestones
- Dependencies
- Risks
- Issues
- Actions
- Documents
- Teams
- Resources
- Calendars
- Deliverables
- Financials
- Audit
- AI Executions
- AI Insights
- Delivery Metrics

Additional domains may be introduced through approved architecture governance.

---

# 10. Stream Naming Standards

Logical stream names should be technology-independent.

Examples:

```
pm.projects

pm.tasks

pm.milestones

pm.dependencies

pm.risks

pm.documents

pm.resources

pm.portfolios

pm.audit

pm.ai.executions

pm.ai.insights

pm.metrics.delivery
```

Technology-specific naming must be avoided.

---

# 11. Publication Triggers

Typical publication triggers include:

- Entity Created
- Entity Updated
- Entity Deleted
- Business Event Raised
- Scheduled Publication
- AI Insight Generated
- Manual Publication Request

The Publishing Platform supports both event-driven and scheduled publication models.

---

# 12. Schema Versioning

All published schemas must be versioned.

Example:

```
v1

v2

v3
```

Breaking schema changes require architectural approval.

Backward compatibility should be maintained whenever practical.

---

# 13. Security Model

Publishing must support:

- Authentication
- Authorization
- Tenant isolation
- Field-level filtering
- Data masking
- Sensitive information protection
- Audit logging

Consumers receive only authorized data.

---

# 14. Observability

The Publishing Platform publishes operational telemetry including:

- Publication requests
- Successful publications
- Failed publications
- Retry attempts
- Publication latency
- Throughput
- Adapter diagnostics
- Policy violations

---

# 15. AI Integration

The AI Platform generates enterprise intelligence.

Examples include:

- Executive summaries
- Delivery forecasts
- Capacity analysis
- Portfolio insights
- Risk predictions
- Health indicators

The AI Platform never publishes directly.

Instead:

```
AI Platform
      │
Publication Pipeline
      │
Publisher Registry
      │
Publisher Adapter
      │
Enterprise Consumers
```

This separation ensures consistent governance and auditing.

---

# 16. Fabrix RDAF Integration (MVP)

The initial publication target is Fabrix RDAF Persistent Streams (PStreams).

PStreams provide the enterprise distribution layer for operational data and AI-generated intelligence.

Initial publication domains include:

- Projects
- Tasks
- Milestones
- Risks
- Documents
- Portfolios
- AI Insights
- Delivery Metrics

Future implementations may support append or update semantics depending on the domain model and enterprise requirements.

The Publishing Platform remains independent of the underlying publication technology through the Publisher Adapter architecture.

---

# 17. Consumer Model

Enterprise consumers may include:

- Cursor-based Vibe Coded Applications
- Executive Dashboards
- AI Agents
- Business Intelligence Platforms
- Reporting Systems
- Automation Workflows
- Enterprise Analytics
- Internal Developer Platforms

Consumers interact with governed published data rather than transactional databases.

---

# 18. Future Roadmap

Future capabilities include:

- Multi-target publishing
- Event streaming
- Change Data Capture (CDC)
- Vector publishing
- Knowledge publishing
- Graph publishing
- Real-time synchronization
- Enterprise data governance
- Data quality validation
- Publication replay
- Dead-letter handling

---

# 19. Architectural Principles

The Publishing Platform is governed by the following principles:

1. PM Platform is the System of Record.
2. Publishing Platform is the System of Distribution.
3. AI Platform is the System of Intelligence.
4. Business logic remains within domain services.
5. Publishing is provider agnostic.
6. Publication schemas are versioned.
7. Security and governance are mandatory.
8. Enterprise consumers use governed published data.
9. Transactional databases are never exposed directly.
10. All publication targets are implemented through adapters.

---

# 20. Summary

The Enterprise Publishing Platform enables the PM Platform to become an enterprise-wide source of governed delivery intelligence.

By separating transactional systems, enterprise distribution, and AI-generated intelligence, the architecture provides a scalable foundation for analytics, automation, AI assistants, developer tooling, and future enterprise applications while maintaining security, consistency, and provider independence.