---
name: architecture-review
description: Read-only audit of the codebase for architectural quality and consistency against CLAUDE.md — separation of concerns, naming, structure, duplication, dependency direction, validation and security boundaries, and testability. Reports findings by severity with file and line references. Does not modify files unless explicitly asked.
argument-hint: "[path or area to focus on, optional]"
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(wc:*), Bash(cat:*)
---

# Architecture review

Audit the codebase (or the path/area given in `$ARGUMENTS`) for architectural quality and consistency.

**This is a read-only audit.** Do not create, edit or delete files, and do not write rewritten code.
Only if the user explicitly asks for changes afterwards, follow section 4.

The goal is twofold: improve the codebase, and help the developer (an IT student) learn to reason about its
architecture independently.

## 1. Establish the baseline

Before judging anything:

- Read `CLAUDE.md` and `PROJECT.md` for the intended stack, architecture, naming and domain terms.
- Inspect the actual project: `package.json` files, framework config, folder layout, a few representative
  files per layer. The code's established conventions are the baseline; note where `CLAUDE.md` and the code disagree.
- Identify the real architectural pattern in use. In this project that is expected to be Vendure plugins
  (resolvers/controllers → services → TypeORM/`TransactionalConnection`) and a Next.js App Router storefront
  (route handlers/server actions → data-access module → components). Do not assume MVC unless the code is MVC.

If the repo has little or no code yet, say so and audit only what exists.

## 2. Check these areas

1. **Separation of concerns** and adherence to the project's pattern.
2. **Request-handler responsibilities** (MVC where applicable): resolvers, controllers, route handlers and server
   actions only validate input, call a service and shape the response — no business rules, no direct DB queries.
   Components and views contain no business logic.
3. **Naming** conventions and inconsistent domain terminology (e.g. `installment` vs `termijn`, cents vs euros,
   synonyms for `Order`/`Payment`/`Refund`).
4. **Folder structure** and file/class naming alignment (`*.service.ts` exports a service, components match file names, etc.).
5. **Duplicate logic, oversized files/classes, and inappropriate abstractions** — including business rules
   duplicated between backend and storefront, and layers/interfaces with a single implementation and no reason.
6. **Dependency direction** and dependency injection usage — services must not import resolvers; storefront must not
   reach Postgres or Mollie directly; NestJS DI used as the framework intends, not wrapped.
7. **Validation, error handling and security boundaries** — untrusted input validated at the edge; Mollie webhooks
   re-fetch the payment instead of trusting the body; no secrets in code; money as integer cents; in3 rules
   (amount range, no surcharge, NL/EUR) enforced server-side; errors handled explicitly, not swallowed.
8. **Testability and missing important tests** — checkout, in3 eligibility, webhooks, order state transitions,
   refunds; code structured so these can be tested.
9. **Deviations from existing project conventions**.

Use `Grep`/`Glob` to verify every claim against the code. Use `git log`/`git blame` when history explains a choice.

## 3. Report

The developer is an IT student who wants to understand the architecture, not just receive a list of fixes.
Follow "Learning and mentoring" in `CLAUDE.md` throughout the report.

**Start with a plain-language overview** of the architecture you found: the main parts, how a request flows
through them (e.g. storefront → Shop API → resolver → service → database), and where it matches or departs from
the intended design. Explain unfamiliar concepts briefly the first time they matter — such as Vendure plugins,
NestJS dependency injection, `TransactionalConnection`, GraphQL resolvers, Next.js server actions and
data-access modules. Skip concepts that don't come up.

Then group findings by severity, most severe first. For every finding give:

- **Severity:** `critical`, `high`, `medium` or `low`.
  - critical — security hole, data/money corruption, or broken core flow.
  - high — real defect or architectural violation likely to cause bugs or block testing.
  - medium — maintainability problem with a concrete cost (duplication, wrong layer, misleading names).
  - low — minor inconsistency or polish.
- **Location:** file path and line numbers (`path/to/file.ts:42-58`) where available.
- **What the code does now:** a plain description of the current behaviour or structure.
- **Problem:** why it is problematic (if it is) and why it matters, concretely.
- **Principle:** the architectural principle involved (e.g. separation of concerns, single responsibility,
  dependency direction, validate at the boundary, DRY) and what it means here.
- **Fix:** a specific recommended change, described in words — do not write the rewritten code.
- **Example (when it helps):** a small, concrete snippet or scenario that makes the issue clear.
- **Type:** `defect` (objectively wrong or risky), `improvement` (optional, with a real benefit) or
  `preference` (subjective/stylistic). Never present a preference or improvement as a defect.

For `low` findings, a one- or two-line version is enough.

Rules for recommendations:

- Do not recommend adding layers (repositories, CQRS, Clean Architecture, factories, extra interfaces) just because
  they are common in enterprise code. Recommend one only with a concrete problem it solves here.
- Prefer the simplest fix that is maintainable and consistent with the existing code.
- If an area is fine, say so briefly rather than inventing findings.

End with:

1. **Summary:** overall assessment, the top three things to fix first, and which findings are preferences
   that can safely be ignored.
2. **Three concepts to learn**, ordered by importance: for each, what it is in one or two sentences, why it
   matters for this codebase (link it to specific findings), and where to look in the code or official docs.
3. **Try it yourself:** point out which findings are straightforward enough for the developer to fix
   independently, and offer to review their solution.

Then stop — do not modify files.

## 4. If asked to fix something afterwards

- First explain the proposed change and its trade-offs, and wait for approval.
- For straightforward fixes, suggest the developer try it first and offer to review their diff.
- Implement only the approved, focused changes; run the relevant tests, lint and type check.
