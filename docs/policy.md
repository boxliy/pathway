# Documentation Policy

Purpose: define how documentation is placed and maintained in this repository.
Read this before adding new docs.
This policy does not replace package READMEs or source-level API comments.

## Placement

Use `docs/` for maintained project documentation. Choose the destination by document responsibility:

- `docs/spec/`: defines what must be true.
- `docs/runbook/`: defines a sequence to execute.
- `docs/reference/`: describes the current checked-in implementation or layout.
- `docs/decisions/`: records why a long-lived tradeoff was accepted.

Do not create empty class directories. Add a directory only with the first real document for that class.

## Naming

Use stable subject-based, kebab-case names:

```text
<topic-name>.md
```

Avoid lifecycle names such as `draft`, `final`, `phase1`, or date prefixes unless chronology is part of the subject.

## Maintenance

Keep one authoritative document per topic. Link to the source of truth instead of duplicating content across documents.

Every document should start with a short routing header that states:

- its purpose,
- when to read it,
- what it does not cover.
