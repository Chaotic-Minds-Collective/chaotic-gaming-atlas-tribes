import test from "node:test";
import assert from "node:assert/strict";
import {
  diffTribeMembershipSnapshots,
  normalizeTribeSnapshot
} from "../src/snapshot.js";

const base = {
  schemaVersion: 1,
  observedAt: "2026-11-13T18:00:00.000Z",
  scope: {
    clusterId: "cluster-1",
    gridId: "grid-a",
    serverId: "server-1"
  },
  tribe: {
    providerTribeId: "tribe-42",
    displayName: "The Example Tribe",
    members: [
      { providerMemberId: "player-2", displayName: "Second Player" },
      { providerMemberId: "player-1", displayName: "First Player" }
    ]
  }
};

function snapshot(overrides = {}) {
  return normalizeTribeSnapshot({
    ...base,
    ...overrides,
    scope: { ...base.scope, ...overrides.scope },
    tribe: { ...base.tribe, ...overrides.tribe }
  });
}

test("normalizes a cluster-scoped tribe snapshot and sorts members deterministically", () => {
  const result = snapshot();
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.tribe.tribeKey, "cluster-1:tribe-42");
  assert.deepEqual(
    result.tribe.members.map((member) => member.providerMemberId),
    ["player-1", "player-2"]
  );
  assert.equal(result.tribe.displayName, "The Example Tribe");
  assert.deepEqual(result.scope, base.scope);
});

test("uses provider IDs rather than display names for identity", () => {
  const first = snapshot();
  const renamed = snapshot({
    tribe: {
      ...base.tribe,
      displayName: "Renamed Tribe",
      members: [
        { providerMemberId: "player-2", displayName: "New Display Name" },
        { providerMemberId: "player-1", displayName: "First Player" }
      ]
    }
  });
  assert.equal(first.tribe.tribeKey, renamed.tribe.tribeKey);
  assert.deepEqual(
    first.tribe.members.map((member) => member.providerMemberId),
    renamed.tribe.members.map((member) => member.providerMemberId)
  );
});

test("keeps tribe identity stable when its observation comes from another grid", () => {
  const first = snapshot();
  const second = snapshot({
    observedAt: "2026-11-13T18:05:00.000Z",
    scope: { ...base.scope, gridId: "grid-b", serverId: "server-2" }
  });
  assert.equal(first.tribe.tribeKey, second.tribe.tribeKey);
  assert.notEqual(first.snapshotId, second.snapshotId);
});

test("escapes delimiters in cluster and provider identifiers", () => {
  const first = snapshot({
    scope: { ...base.scope, clusterId: "cluster:a" },
    tribe: { ...base.tribe, providerTribeId: "b" }
  });
  const second = snapshot({
    scope: { ...base.scope, clusterId: "cluster" },
    tribe: { ...base.tribe, providerTribeId: "a:b" }
  });
  assert.notEqual(first.tribe.tribeKey, second.tribe.tribeKey);
});

test("rejects duplicate member provider IDs", () => {
  assert.throws(() => snapshot({
    tribe: {
      ...base.tribe,
      members: [
        { providerMemberId: "same" },
        { providerMemberId: "same" }
      ]
    }
  }), /duplicate providerMemberId/);
});

test("rejects malformed snapshots, IDs, timestamps and member collections", () => {
  assert.throws(() => normalizeTribeSnapshot(null), /snapshot must be an object/);
  assert.throws(() => snapshot({ schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => snapshot({ observedAt: "yesterday" }), /observedAt/);
  assert.throws(() => snapshot({ observedAt: "2026-02-30T18:00:00Z" }), /observedAt/);
  assert.throws(() => snapshot({
    scope: { ...base.scope, clusterId: " " }
  }), /scope.clusterId/);
  assert.throws(() => snapshot({
    tribe: { ...base.tribe, providerTribeId: 42 }
  }), /providerTribeId/);
  assert.throws(() => snapshot({
    tribe: { ...base.tribe, members: {} }
  }), /members must be an array/);
  assert.throws(() => snapshot({
    tribe: { ...base.tribe, members: [{ providerMemberId: "" }] }
  }), /providerMemberId/);
  assert.throws(() => snapshot({
    tribe: { ...base.tribe, members: [{ providerMemberId: "p1", displayName: 7 }] }
  }), /displayName/);
});

test("rejects membership diffs across different cluster-scoped tribes", () => {
  const first = snapshot();
  const other = snapshot({
    tribe: { ...base.tribe, providerTribeId: "another-tribe" }
  });
  assert.throws(
    () => diffTribeMembershipSnapshots(first, other),
    /same cluster-scoped tribe/
  );
});

test("reports joined, left and unchanged members without mutating either snapshot", () => {
  const previous = snapshot();
  const next = snapshot({
    observedAt: "2026-11-13T18:01:00.000Z",
    tribe: {
      ...base.tribe,
      members: [
        { providerMemberId: "player-2", displayName: "Second Player" },
        { providerMemberId: "player-3", displayName: "Third Player" }
      ]
    }
  });
  const beforePrevious = structuredClone(previous);
  const beforeNext = structuredClone(next);

  const result = diffTribeMembershipSnapshots(previous, next);
  assert.deepEqual(result.joined, ["player-3"]);
  assert.deepEqual(result.left, ["player-1"]);
  assert.deepEqual(result.unchanged, ["player-2"]);
  assert.deepEqual(previous, beforePrevious);
  assert.deepEqual(next, beforeNext);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.joined));
});

test("returns immutable snapshots and nested member records", () => {
  const result = snapshot();
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.scope));
  assert.ok(Object.isFrozen(result.tribe));
  assert.ok(Object.isFrozen(result.tribe.members));
  assert.ok(Object.isFrozen(result.tribe.members[0]));
});

test("rejects malformed inputs to the membership diff", () => {
  const valid = snapshot();
  assert.throws(
    () => diffTribeMembershipSnapshots({ ...valid, schemaVersion: 2 }, valid),
    /schemaVersion/
  );
  assert.throws(
    () => diffTribeMembershipSnapshots({
      ...valid,
      tribe: { ...valid.tribe, tribeKey: "forged-key" }
    }, valid),
    /does not match/
  );
  assert.throws(
    () => diffTribeMembershipSnapshots({
      ...valid,
      scope: { ...valid.scope, serverId: " " }
    }, valid),
    /scope.serverId/
  );
});


test("preserves opaque IDs including surrounding whitespace through normalization and diff", () => {
  const members = [
    { providerMemberId: "player" },
    { providerMemberId: " player " }
  ];
  const previous = snapshot({
    scope: { clusterId: " cluster ", gridId: " grid ", serverId: " server " },
    tribe: { providerTribeId: " tribe ", members }
  });
  assert.deepEqual(previous.scope, {
    clusterId: " cluster ", gridId: " grid ", serverId: " server "
  });
  assert.equal(previous.tribe.providerTribeId, " tribe ");
  assert.deepEqual(previous.tribe.members.map((member) => member.providerMemberId),
    [" player ", "player"]);
  const next = snapshot({
    scope: previous.scope,
    tribe: { providerTribeId: " tribe ", members: [{ providerMemberId: "player" }] }
  });
  const diff = diffTribeMembershipSnapshots(previous, next);
  assert.deepEqual(diff.left, [" player "]);
  assert.deepEqual(diff.unchanged, ["player"]);
  assert.deepEqual(diff.joined, []);
  for (const other of [
    snapshot({ scope: { clusterId: "cluster" }, tribe: { providerTribeId: " tribe " } }),
    snapshot({ scope: previous.scope, tribe: { providerTribeId: "tribe" } })
  ]) {
    assert.notEqual(previous.tribe.tribeKey, other.tribe.tribeKey);
    assert.throws(() => diffTribeMembershipSnapshots(previous, other), /same cluster-scoped tribe/);
  }
});

test("rejects sparse member arrays during normalization", () => {
  for (const members of [new Array(1), [, { providerMemberId: "player" }],
    [{ providerMemberId: "player" }, ,]]) {
    assert.throws(() => snapshot({ tribe: { members } }), /must be an object/);
  }
});
