# Development Work Package Policy

Status: ACTIVE
Applies from: DT-DEV-BOOTSTRAP-0001

## Objective
Minimize prompt count and repeated context while preserving GEF evidence, safety and review quality.

## Default unit of work
Use one large Work Package per coherent module/domain whenever feasible.

A Work Package should include, in the same executor prompt:
- implementation;
- tests;
- documentation;
- migrations/configuration;
- local developer workflow;
- evidence;
- Git hygiene;
- final validation.

Do not fragment a coherent module into micro-prompts merely to reduce individual prompt size.

## Executor behavior
The executor must:
1. read the canonical checkpoint, Work Order, Context Lock and referenced source docs;
2. execute all in-scope subtasks autonomously;
3. not stop after each subtask;
4. resolve ordinary implementation/test errors without asking for permission;
5. run the complete required validation suite;
6. update evidence and docs;
7. inspect git status/diff before stopping;
8. stop only at the explicit STOP CONDITION.

## Corrections
After a Work Package completes, ChatGPT performs a whole-module review.
If correction is required, prefer one consolidated corrective Work Package over many small patches.

## Size guard
Large does not mean unrelated.
A Work Package may span multiple historical backlog items only when they share the same architectural boundary and can be validated coherently.

## High-assurance guard
Prompt consolidation never relaxes:
- no live-money execution unless separately approved;
- exact-head evidence;
- Risk/Execution authority boundaries;
- secret-handling rules;
- demo-first requirements;
- canonical Git governance.

## Initial target
V1 aims for roughly six primary implementation Work Packages plus corrective packages only when evidence requires them.
