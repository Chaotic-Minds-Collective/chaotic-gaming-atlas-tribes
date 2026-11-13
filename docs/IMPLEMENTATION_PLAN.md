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
1. Confirm stable tribe/member IDs and transfer behavior
2. Build read-only sync and reconciliation
3. Implement management where callbacks permit
4. Map roles to Core scopes
5. Add logs, MOTDs and chat
6. Test transfer, rename, disband and revocation

## Technical gates and risks
- Never trust display names or stale membership for privileged actions
- Core governs CG authorization; ATLAS governs actual membership
- Tribe mutation hooks unverified

## Shared engineering requirements
- Use authenticated, least-privilege Core APIs; no direct database credentials in plugins.
- Preserve provider identifiers as strings; display names are not identifiers.
- Carry cluster, grid and server context on applicable records/events.
- Use stable event IDs, idempotency keys and correlation IDs.
- Keep network work off game-critical threads; use bounded timeouts, retries and circuit breakers.
- Keep secrets out of source control and separate credentials per server/integration.
- Add unit tests, fake-adapter contract tests and isolated runtime compatibility tests.
- Gate unsupported features behind explicit capabilities; fail closed for privileged actions.
- Do not deploy to production or change live server configuration during repository planning.

## Current readiness
Documentation and planning scaffold. Exact ATLAS server build, loader, SDK, callbacks and feature-specific capabilities require isolated reproducible validation.
