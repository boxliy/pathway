---
schema: conductor/repository-workflow-policy/1
execution:
  canonicalize_commands: []
  verify_commands:
    - pnpm --dir ts run build
    - pnpm --dir ts run test
  max_attempts: 3
  retry_backoff_seconds: 60
  command_timeout_seconds: 1800
context:
  read_first:
    - README.md
    - ts/package.json
landing:
  default_merge_method: squash
  allowed_merge_methods:
    - merge
    - squash
---

Use this repository policy as the working contract for automated changes in Pathway.

Pathway is a multilingual address and contact parsing SDK. The repository is organized
as a language-family workspace: TypeScript is the active implementation area, while
Rust and Go are reserved for future SDK targets. Stay within the assigned issue scope
and avoid expanding work across language targets unless the issue explicitly asks for it.

The managed agent is responsible for one assigned issue at a time and must work inside
the workspace assigned for that issue. Do not start unrelated work, widen the issue scope,
or invent lifecycle transitions that are not represented by project state, tracker
records, or PR state.

Use the repository's package-manager scripts whenever an equivalent task exists. The
normal repository gate is the ordered `[execution].canonicalize_commands` followed by
`[execution].verify_commands`; for this repository that means running the TypeScript
build and test commands declared above. Do not claim work is complete, fixed, reviewed,
or ready to land without fresh evidence from that gate or a narrower command that
directly proves the claim.

The normal implementation path is:

1. Read the assigned issue, the current work state, this workflow policy, and the files
   needed to understand the requested change.
2. Make the smallest coherent code, test, and documentation changes required by the
   issue. Runtime behavior changes should update relevant package docs or reference
   material when this repository maintains them.
3. Use repository-native commands for build, validation, and tests.
4. Keep commit messages focused on the change itself; do not hand-write lifecycle state
   into commit messages unless this repository explicitly requires it.
5. Push the work branch and create or update the PR through the configured project flow.
6. Leave issue progress, terminal records, review handoff, repair completion, and closeout
   through the declared tracker tools when tracker writeback is enabled.

Treat `context.read_first` as required startup context. The runtime may inline small
repository-relative files in the first turn; larger files are listed with path, size, and
hash and must be read from the assigned workspace before editing. This is an execution
contract, not a separate read-receipt workflow.

Tracker writeback is part of the execution contract when enabled. Use only the declared
tracker tools for issue transitions, comments, labels, progress records, attempt results,
terminal records, review checkpoints, review handoff, repair completion, and closeout.
Tool calls must stay scoped to the currently assigned issue and current attempt. Before
any ordinary terminal success, write `issue_attempt_result` with schema
`conductor/attempt-result/1`, then write and finalize the terminal record. Do not write
ad hoc lifecycle state into ordinary comments when a structured tracker record exists.

When declared by the managed-agent runtime, use `conductor_issue_provider.issue_get` to
fetch referenced issue context and `conductor_issue_provider.issue_comments_list` to
refresh comments. These issue-provider tools are for context reads; lifecycle writeback
still goes through the configured tracker tools above. Use
`conductor_issue_provider.issue_comment_create` only for ordinary current-issue comments,
not lifecycle records that have a structured tracker tool.

New human feedback on the issue during an active attempt interrupts the attempt and is
handled through a fresh-attempt retry when retry budget remains. Treat any previous
attempt worktree named in the prompt as inspection-only context unless a human explicitly
asks you to copy or merge from it.

Treat `In Review` as a PR-backed handoff state. A normal success path must have a pushed
work branch, a reviewable PR, validation evidence, and a tracker handoff record before
the issue is considered ready for review. Post-review repair should reuse the existing
work branch when the issue, branch, PR, and attempt lineage still match.

Conductor injects the resolved `repository.lane.base_update_strategy` into managed-agent
prompts as the runtime source of truth for PR branch history. The default `merge`
strategy preserves existing PR branch history; agents should not rebase, amend, or
force-push unless Conductor policy explicitly selects the `rebase` strategy. Optional
intermediate commits should use Conductor-controlled checkpoint tools when those tools
are available.

Review work must be bounded and evidence-based:

- Review the current diff or current retained workspace, not memory of an older attempt.
- Check implementation correctness, regression risk, missing tests, docs/config drift,
  package API fallout, operator-facing fallout, and recovery behavior.
- Treat outside review comments as candidate findings to validate against the current
  code, not automatic truth.
- Fix the smallest coherent batch, rerun the relevant gate, and record the review outcome
  for the exact head that was checked.
- Escalate instead of endlessly patching if the work needs product judgment, architecture
  judgment, unclear ownership, or repeated non-converging repair.

Keep secrets out of every durable surface: issue comments, PR bodies, commit messages,
logs, state files, snapshots, metrics labels, and test fixtures. Use environment variables
or configured secret references for provider tokens. If a command prints a token or private
value, stop and treat the workspace as needing cleanup before continuing.

Do not implement localization by checking concrete language tag strings in runtime logic.
Do not add branches like `if language == "zh-TW"` or
`match base_language(language) { "zh" => ... }` to select human prose. Prefer
agent-provided structured fields, explicit localization resources with supported locale
semantics, or stable machine-oriented English with documented exceptions.

Keep provider-specific behavior behind the existing provider abstractions unless the
issue explicitly asks to change the abstraction.

Keep branch, workspace, and worktree behavior aligned with the repository policy and state
store. Do not reuse another issue's workspace, do not delete retained work manually to
hide a failed attempt, and do not continue when ownership signals disagree. If the runtime
cannot prove the retained workspace, tracker issue, branch, and PR still refer to the same
work, mark the issue for manual attention through the tracker tools instead of guessing.
