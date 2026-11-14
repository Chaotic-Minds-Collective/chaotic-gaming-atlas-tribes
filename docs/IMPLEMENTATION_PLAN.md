# CMG Tribes — Implementation Plan

## Purpose

Cluster-aware tribe/group management with consistent authorization and activity records.

## Feature scope

- Cluster-scoped tribe identity and member sync
- Invite/join/leave/promote/demote/kick and member limits
- Custom roles and granular permissions
- Ownership and shared benefits
- Tribe chat authorization
- Tribe MOTDs and notifications
- Logs for deaths, ship loss, structure destruction and membership changes

## Dependencies

- Core scoped RBAC, identity resolution, outbox and audit
- ATLAS adapter: tribe/member callbacks
- Connect for chat/MOTDs; Sentinel for alerts; Commerce for rewards

## Data ownership

ATLAS tribe IDs are cluster-scoped; never key by name. Tribes owns membership snapshots, roles, invites, settings and reconciliation. Live game remains authoritative until mutation hooks are verified.

## Milestones

1. Confirm stable tribe/member IDs and transfer behavior.
2. Build read-only sync and reconciliation.
3. Implement management where callbacks permit.
4. Map roles to Core scopes.
5. Add logs, MOTDs and chat.
6. Test transfer, rename, disband and revocation.

### Implemented: read-only snapshot contract

- Added a schema-v1 normalized snapshot contract with explicit cluster/grid/server observation scope.
- Constructed stable tribe identity from cluster ID plus provider tribe ID; grid and server remain observation metadata.
- Preserved provider identifiers as strings and separated display names from identity.
- Added deterministic member ordering, duplicate-ID rejection, strict timestamp validation and immutable output.
- Added a pure membership diff that reports joined, left and unchanged provider member IDs between snapshots.
- Added dependency-free Node.js tests and a Node 22 GitHub Actions workflow.

This milestone consumes an explicitly supplied provider snapshot. It does not define or claim native ATLAS callback payloads, poll a server, persist state, change membership, or grant permissions.

## Technical gates and risks

- Never trust display names or stale membership for privileged actions.
- Core governs CMG authorization; ATLAS governs actual membership.
- Tribe mutation hooks remain unverified.
- Stable provider tribe/member identifiers and transfer behavior must be confirmed against the exact target server build before native mapping.
- Do not infer role permissions from provider role labels; map them through explicit Core scopes and authorization policy.

## Shared engineering requirements

- Use authenticated, least-privilege Core APIs; no direct database credentials in plugins.
- Preserve provider identifiers as strings; display names are never identifiers.
- Carry cluster, grid and server context on applicable records/events.
- Use stable event IDs, idempotency keys and correlation IDs.
- Keep network work off game-critical threads; use bounded timeouts, retries and circuit breakers.
- Keep secrets out of source control and separate credentials per server/integration.
- Add unit tests, fake-adapter contract tests and isolated runtime compatibility tests.
- Gate unsupported features behind explicit capabilities; fail closed for privileged actions.
- Do not deploy to production or change live server configuration during repository planning.

## Current readiness

The read-only normalization and reconciliation foundation is implemented and covered by automated tests. Exact ATLAS server build, loader, SDK, callbacks and feature-specific capabilities still require isolated reproducible validation.
