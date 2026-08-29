# Contractor Mining & Production Sharing Workflow

This project now includes a dedicated Contractor Mining workspace at `/contractor-mining`.

## Implemented core lifecycle

The workspace follows **Plan → Mine → Haul → Receive → Share → Settle → Report** and carries a shared Reference ID from assignment through daily reports, haulage receipts, and settlements.

The core module includes Mine Block master data, Contractor master data, production-sharing Contract and Share Rule details, contractor Assignment lifecycle controls, Daily Mining Report capture, Haulage Ticket and Weighbridge Receipt capture, QA/quality hold states, and 3-way Share Settlement calculation.

## Control rules

Suspended or closed assignments cannot create daily reports or dispatch haulage. An assignment with an HSE exception cannot be activated. Only receipts marked **Received** with **QA PASS** are eligible for settlement calculation. Settlement approval and settlement execution are blocked for suspended assignments or non-approved quality material.

## Current storage boundary

The frontend service first attempts `GET /api/contractor-mining/state` for a future persistent backend implementation. When that endpoint is not available, the workflow uses a browser-local store with seeded demonstration records so the core flow remains usable in the current repository. The existing Java backend does not yet expose contractor-mining persistence endpoints; Phase 2 can move the same typed model and guarded transitions into the `backend-java` modules and Flyway migrations.

## Verification

`npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` pass. The test suite contains 24 passing tests and 1 intentionally skipped test.
