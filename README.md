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

The first server-independent milestone provides `src/snapshot.js`:

- Normalizes an explicitly supplied provider snapshot into an immutable schema-v1 contract.
- Builds tribe identity from the cluster ID and provider tribe ID; grid/server identify the observation source, not tribe identity.
- Preserves provider IDs as opaque strings and treats display names as descriptive only.
- Sorts members deterministically and rejects duplicate member IDs.
- Compares two snapshots to report joined, left and unchanged provider member IDs without issuing game mutations.

This is a pure contract and reconciliation layer. It does not discover native callbacks, poll a server, persist membership, grant permissions, or modify ATLAS state.

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
- Read-only snapshots do not authorize privileged actions. Core governs CMG authorization; ATLAS governs actual membership until verified mutation hooks exist.
- No direct database credentials, native game writes, live server access, or production deployment are included.
- Exact ATLAS server build, loader, SDK, callbacks, threading model and feature-specific capabilities still require isolated reproducible validation.
