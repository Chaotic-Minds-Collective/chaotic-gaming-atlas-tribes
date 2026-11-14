import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCoreTribeEvent } from "../src/core-event.js";

function event(overrides = {}) {
  return {
    eventType: "game.event.received",
    payload: {
      eventRecordId: "core-record-1",
      eventId: "provider-event-1",
      game: "atlas",
      eventType: "tribe.member.joined",
      occurredAt: "2026-11-13T18:00:00.000Z",
      clusterId: "cluster-1",
      gridId: "grid-a",
      serverId: "server-1",
      correlationId: "sync-42",
      payload: { providerTribeId: "tribe-42", providerMemberId: "player-7", displayName: "The Example Tribe" },
      ...overrides
    }
  };
}

test("normalizes Core outbox tribe membership events with explicit scope", () => {
  const result = normalizeCoreTribeEvent(event());
  assert.equal(result.action, "member.joined");
  assert.equal(result.tribe.tribeKey, "cluster-1:tribe-42");
  assert.equal(result.tribe.providerMemberId, "player-7");
  assert.equal(result.scope.gridId, "grid-a");
  assert.equal(result.correlationId, "sync-42");
});

test("maps the four documented tribe event types", () => {
  for (const [eventType, action, memberId] of [
    ["tribe.created", "tribe.created", undefined],
    ["tribe.member.joined", "member.joined", "player-7"],
    ["tribe.member.left", "member.left", "player-7"],
    ["tribe.updated", "tribe.updated", undefined]
  ]) {
    const result = normalizeCoreTribeEvent(event({
      eventType,
      payload: { providerTribeId: "tribe-42", ...(memberId ? { providerMemberId: memberId } : {}) }
    }));
    assert.equal(result.action, action);
    assert.equal(result.tribe.providerMemberId, memberId ?? null);
  }
});

test("keeps provider IDs opaque and escapes tribe identity delimiters", () => {
  const result = normalizeCoreTribeEvent(event({
    clusterId: "cluster:a",
    payload: { providerTribeId: "tribe:b", providerMemberId: " player " }
  }));
  assert.equal(result.tribe.tribeKey, "cluster%3Aa:tribe%3Ab");
  assert.equal(result.tribe.providerMemberId, " player ");
});

test("normalizes timestamps, freezes output and does not mutate input", () => {
  const input = event({ occurredAt: "2026-11-13T10:00:00-08:00" });
  const before = structuredClone(input);
  const result = normalizeCoreTribeEvent(input);
  assert.equal(result.occurredAt, "2026-11-13T18:00:00.000Z");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.scope));
  assert.ok(Object.isFrozen(result.tribe));
  assert.deepEqual(input, before);
});

test("rejects non-Core, non-ATLAS and unsupported event envelopes", () => {
  assert.throws(() => normalizeCoreTribeEvent(null), /event must be an object/);
  assert.throws(() => normalizeCoreTribeEvent({ eventType: "tribe.member.joined", payload: {} }), /game.event.received/);
  assert.throws(() => normalizeCoreTribeEvent(event({ game: "7dtd" })), /game must be atlas/);
  assert.throws(() => normalizeCoreTribeEvent(event({ eventType: "tribe.kicked" })), /supported tribe event/);
});

test("requires provider tribe and membership member IDs", () => {
  assert.throws(() => normalizeCoreTribeEvent(event({ payload: { providerMemberId: "p1" } })), /providerTribeId/);
  assert.throws(() => normalizeCoreTribeEvent(event({ payload: { providerTribeId: "t1" } })), /providerMemberId/);
});

test("rejects missing scope, event identifiers and invalid timestamps", () => {
  for (const overrides of [
    { clusterId: null }, { serverId: "" }, { eventId: "" },
    { eventRecordId: "" }, { occurredAt: "yesterday" }
  ]) assert.throws(() => normalizeCoreTribeEvent(event(overrides)));
});
