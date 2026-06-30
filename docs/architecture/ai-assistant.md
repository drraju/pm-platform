# AI Assistant Architecture

## Purpose

The AI Assistant is a planned intelligence layer for project, program, portfolio, executive, and customer success workflows. It should augment human decision-making, not silently automate governance decisions.

## AI Roles

| Role | Responsibilities |
| --- | --- |
| AI Project Manager | Daily project summaries, task follow-up, RAID highlights, status draft preparation |
| AI Program Manager | Cross-project dependency awareness and program-level risk synthesis |
| AI Portfolio Manager | Health trends, executive escalation candidates, portfolio recommendations |
| AI Executive Assistant | Briefings, decision packs, meeting preparation |
| AI Customer Success Manager | Customer-facing health summaries and adoption insights |

## Capabilities

- Daily summaries.
- Risk prediction.
- Delay prediction.
- Meeting preparation.
- Status report drafting.
- Recommendations and next-best actions.
- Natural language search across projects, RAID, tasks, and reports.

## Architecture

```text
User Request
  v
AI Orchestration Layer
  |-- Intent classification
  |-- Permission check
  |-- Tool selection
  |-- Source retrieval
  |-- Response generation
  |-- Audit logging
  v
Domain Tools
  |-- Projects
  |-- Planning
  |-- Tasks
  |-- RAID
  |-- Reports
```

## Integration Options

| Provider | Use Case |
| --- | --- |
| OpenAI | General hosted LLM workflows |
| Azure OpenAI | Enterprise hosted LLM with Azure controls |
| Claude | Alternate reasoning and drafting provider |
| Local LLM | Self-hosted and restricted deployments |
| MCP | Tool and context protocol for agentic workflows |

## Agentic Workflows

Agentic workflows must be explicit, auditable, and permission-bound. A future AI agent may draft a report or suggest task changes, but destructive or externally visible actions require user confirmation.

## Governance Principles

- AI must cite source data or explain uncertainty.
- AI cannot bypass RBAC.
- AI recommendations must be distinguishable from human-entered project data.
- AI writes must be logged.
- AI-generated reports require human approval before external distribution.
