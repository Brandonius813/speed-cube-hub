---
name: plan-exit-review
description: Review implementation plans before coding. Challenge scope, evaluate architecture/code quality/tests/performance, identify risks and regressions, provide opinionated recommendations, and ask the user to choose on key tradeoffs.
---

# Plan Review Mode

Review the plan thoroughly before code changes. For every issue, explain concrete tradeoffs, give an opinionated recommendation, and ask for user input before locking direction.

## Priority hierarchy

If context is tight or the user asks to compress: Step 0 > Test diagram > Opinionated recommendations > everything else. Never skip Step 0 or the test diagram.

## Engineering preferences

- DRY is important; flag repetition aggressively.
- Well-tested code is non-negotiable.
- Target engineered-enough solutions, avoiding under- and over-engineering.
- Prefer thoughtful edge-case handling.
- Bias explicit over clever.
- Prefer minimal diff: fewest new abstractions and touched files.

## Documentation and diagrams

- Use ASCII diagrams for data flow, state machines, dependency graphs, pipelines, and decision trees.
- For complex behavior, include inline ASCII diagrams in code comments where relevant.
- If touched code already contains diagrams, verify and update them when stale.

## Step 0: Scope challenge

Before full review, answer:

1. What existing code already solves each sub-problem?
2. What minimum changes achieve the core objective?
3. If the plan touches more than 8 files or adds more than 2 new classes/services, challenge complexity.

Then ask the user to choose one option:

1. `SCOPE REDUCTION`: Overbuilt plan; propose minimal scope and review that.
2. `BIG CHANGE`: Interactive section-by-section review (Architecture -> Code Quality -> Tests -> Performance), max 4 top issues per section.
3. `SMALL CHANGE`: Compressed pass with one most-important issue per section plus test diagram and completion summary.

If user does not choose `SCOPE REDUCTION`, respect the selected scope and optimize within it.

## Review sections

### 1. Architecture review

Evaluate design boundaries, dependencies, data flow, scaling, security boundaries, and failure scenarios per new code path.

Pause after this section. Ask the user to choose among labeled options for each issue before proceeding.

### 2. Code quality review

Evaluate organization, DRY violations, edge-case handling, technical debt, and engineering-level fit. Verify touched ASCII diagrams are still accurate.

Pause after this section. Ask the user to choose among labeled options for each issue before proceeding.

### 3. Test review

Create a diagram of new UX, new data flow, new code paths, and new branches/outcomes. For each item, verify there is corresponding JS or Rails test coverage.

For LLM/prompt changes, check patterns listed in `AGENTS.md`, define required eval suites, and ask the user to confirm eval scope.

Pause after this section. Ask the user to choose among labeled options before proceeding.

### 4. Performance review

Evaluate N+1 risks, memory usage, caching opportunities, and high-complexity slow paths.

Pause after this section. Ask the user to choose among labeled options before proceeding.

## For each issue

For every concrete issue:

- Cite file and line references.
- Provide 2-3 options, including do-nothing when reasonable.
- For each option, state effort, risk, and maintenance burden in one line.
- Lead with a directive recommendation.
- Map recommendation to one explicit engineering preference.
- Ask the user to choose with labeled options (`1A`, `1B`, `1C`) in concise plain text.

## Required outputs

### NOT in scope

List explicitly deferred work with one-line rationale.

### What already exists

List existing flows/components that solve parts of the problem and note whether plan reuses or duplicates them.

### TODOS.md updates

For valuable deferred work, ask user which items to capture, then add detailed TODO entries with:

- What
- Why
- Context
- Depends on / blocked by

### Diagrams

Include diagrams in plan output for non-trivial flows, and identify implementation files that should receive inline ASCII diagram comments.

### Failure modes

For each new code path in the test diagram, include one realistic production failure and whether:

1. Tests cover it
2. Error handling exists
3. User sees clear error vs silent failure

Flag any no-test + no-error-handling + silent-failure case as a critical gap.

### Completion summary

End with:

- Step 0: Scope Challenge (user chose: ___)
- Architecture Review: ___ issues found
- Code Quality Review: ___ issues found
- Test Review: diagram produced, ___ gaps identified
- Performance Review: ___ issues found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: ___ items proposed to user
- Failure modes: ___ critical gaps flagged

## Retrospective learning

Review branch git history for previous review cycles touching same areas and increase scrutiny accordingly.

## Formatting rules

- Number issues (1, 2, 3) and letter options (A, B, C)
- Recommended option listed first
- Keep options one sentence each
- Pause after each review section

## Unresolved decisions

If user skips a decision, list it at the end as unresolved and call out future risk.
