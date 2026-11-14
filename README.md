# CMG Tribes

Cluster-aware tribe/group management with consistent authorization and activity records.

This Chaotic Minds Gaming (CMG) module extends [CMG Core](https://github.com/Chaotic-Minds-Collective/cmg-atlas-core-plugin) and the [ATLAS integration adapter](https://github.com/Chaotic-Minds-Collective/cmg-atlas-plugin); it does not replace either foundation.

## Feature scope

- Cluster-scoped tribe identity and member sync
- Invite/join/leave/promote/demote/kick and member limits
- Custom roles and granular permissions
- Ownership and shared benefits
- Tribe chat authorization
- Tribe MOTDs and notifications
- Logs for deaths, ship loss, structure destruction and membership changes

## Current implementation

The server-independent foundation provides:

- `src/snapshot.js`: immutable schema-v1 provider snapshot normalization and pure joined/left/unchanged membership reconciliation.
- `src/core-event.js`: normalization of Core's documented `game.event.received` outbox envelope for `tribe.created`, `tribe.member.joined`, `tribe.member.left` and `tribe.updated`.

The Core event adapter requires explicit cluster/grid/server scope and opaque provider tribe/member IDs. It creates a cluster-scoped tribe key and a normalized activity record. It does not infer native callback names, construct a complete snapshot from partial events, persist membership, or issue game mutations.

## Architecture and dependencies

- Core scoped RBAC, identity resolution, outbox and audit
- ATLAS adapter: verified tribe/member callbacks
- Connect for chat/MOTDs; Sentinel for alerts; Commerce for rewards

Core remains authoritative for shared identity, authorization and platform records. ATLAS-native calls pass through the shared adapter. This module owns its domain state and must not connect directly to PostgreSQL.

## Development

Requires Node.js 22 or newer.

```sh
npm run check
npm test
```

GitHub Actions runs the same checks for pushes and pull requests.

## Safety and compatibility

- Tribe IDs are cluster-scoped; never key identity by display name.
- Read-only snapshots and normalized events do not authorize privileged actions. Core governs CMG authorization; ATLAS governs actual membership until verified mutation hooks exist.
- No direct database credentials, native game writes, live server access, or production deployment are included.
- Exact ATLAS server build, loader, SDK, callbacks, threading model and feature-specific capabilities still require isolated reproducible validation.
