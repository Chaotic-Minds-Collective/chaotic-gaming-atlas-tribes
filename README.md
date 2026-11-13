# CG Tribes

Cluster-aware tribe/group management with consistent authorization and activity records.

This Chaotic Gaming-specific module extends [Chaotic Gaming Core](https://github.com/Chaotic-Minds-Collective/chaotic-gaming-core) and the [ATLAS integration adapter](https://github.com/Chaotic-Minds-Collective/chaotic-gaming-atlas); it does not replace either foundation.

## Feature scope
- Cluster-scoped tribe identity and member sync
- Invite/join/leave/promote/demote/kick and member limits
- Custom roles and granular permissions
- Ownership and shared benefits
- Tribe chat authorization
- Tribe MOTDs and notifications
- Logs for deaths, ship loss, structure destruction and membership changes

## Architecture and dependencies
- Core scoped RBAC, identity resolution, outbox and audit
- ATLAS adapter: tribe/member callbacks
- Connect for chat/MOTDs; Sentinel for alerts; Commerce for rewards

Core remains authoritative for shared identity, authorization and platform records. ATLAS-native calls pass through the shared adapter. This module owns its domain state and must not connect directly to PostgreSQL.

## Implementation plan
See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for data ownership, milestones and technical gates.

## Readiness
Planning scaffold only. Native ATLAS compatibility and feature-specific callbacks are not yet verified on an isolated server. No production deployment is implied.
