const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const MAX_MEMBERS = 10_000;

function record(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function identifier(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function displayName(value, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string or null`);
  }
  return value.trim();
}

function parseTimestamp(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be an ISO date-time with timezone`);
  }
  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    throw new TypeError(`${field} must be an ISO date-time with timezone`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new TypeError(`${field} must be a valid ISO date-time with timezone`);
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${field} must be a valid ISO date-time with timezone`);
  }
  return new Date(parsed).toISOString();
}

function escapeIdPart(value) {
  return value.replaceAll("%", "%25").replaceAll(":", "%3A");
}

function freezeScope(scope) {
  return Object.freeze({
    clusterId: identifier(scope.clusterId, "scope.clusterId"),
    gridId: identifier(scope.gridId, "scope.gridId"),
    serverId: identifier(scope.serverId, "scope.serverId")
  });
}

/**
 * Normalize one read-only provider tribe snapshot.
 *
 * Provider identifiers remain opaque strings. Display names are descriptive
 * only and must never be used as identity or authorization inputs.
 */
export function normalizeTribeSnapshot(input) {
  record(input, "snapshot");
  if (input.schemaVersion !== 1) {
    throw new TypeError("schemaVersion must be 1");
  }

  const observedAt = parseTimestamp(input.observedAt, "observedAt");
  const scope = freezeScope(record(input.scope, "scope"));
  const tribeInput = record(input.tribe, "tribe");
  const providerTribeId = identifier(tribeInput.providerTribeId, "tribe.providerTribeId");
  const membersInput = tribeInput.members;
  if (!Array.isArray(membersInput)) {
    throw new TypeError("tribe.members must be an array");
  }
  if (membersInput.length > MAX_MEMBERS) {
    throw new RangeError(`tribe.members must contain at most ${MAX_MEMBERS} entries`);
  }

  const seenMemberIds = new Set();
  const members = Array.from(membersInput, (member, index) => {
    record(member, `tribe.members[${index}]`);
    const providerMemberId = identifier(
      member.providerMemberId,
      `tribe.members[${index}].providerMemberId`
    );
    if (seenMemberIds.has(providerMemberId)) {
      throw new TypeError("tribe.members must not contain duplicate providerMemberId values");
    }
    seenMemberIds.add(providerMemberId);

    return Object.freeze({
      providerMemberId,
      displayName: displayName(member.displayName, `tribe.members[${index}].displayName`)
    });
  }).sort((left, right) => left.providerMemberId < right.providerMemberId ? -1 : left.providerMemberId > right.providerMemberId ? 1 : 0);

  const tribeKey = [
    scope.clusterId,
    providerTribeId
  ].map(escapeIdPart).join(":");

  return Object.freeze({
    schemaVersion: 1,
    snapshotId: [tribeKey, observedAt].map(escapeIdPart).join(":"),
    observedAt,
    scope,
    tribe: Object.freeze({
      tribeKey,
      providerTribeId,
      displayName: displayName(tribeInput.displayName, "tribe.displayName"),
      members: Object.freeze(members)
    })
  });
}

function snapshotMembers(snapshot, field) {
  record(snapshot, field);
  if (snapshot.schemaVersion !== 1) {
    throw new TypeError(`${field}.schemaVersion must be 1`);
  }

  const scope = record(snapshot.scope, `${field}.scope`);
  const clusterId = identifier(scope.clusterId, `${field}.scope.clusterId`);
  identifier(scope.gridId, `${field}.scope.gridId`);
  identifier(scope.serverId, `${field}.scope.serverId`);

  const tribe = record(snapshot.tribe, `${field}.tribe`);
  const providerTribeId = identifier(
    tribe.providerTribeId,
    `${field}.tribe.providerTribeId`
  );
  const tribeKey = identifier(tribe.tribeKey, `${field}.tribe.tribeKey`);
  const expectedTribeKey = [clusterId, providerTribeId].map(escapeIdPart).join(":");
  if (tribeKey !== expectedTribeKey) {
    throw new TypeError(`${field}.tribe.tribeKey does not match its cluster and provider tribe IDs`);
  }

  const snapshotId = identifier(snapshot.snapshotId, `${field}.snapshotId`);
  if (!Array.isArray(tribe.members)) {
    throw new TypeError(`${field}.tribe.members must be an array`);
  }
  if (tribe.members.length > MAX_MEMBERS) {
    throw new RangeError(`${field}.tribe.members must contain at most ${MAX_MEMBERS} entries`);
  }

  const ids = new Set();
  for (const [index, member] of tribe.members.entries()) {
    record(member, `${field}.tribe.members[${index}]`);
    const id = identifier(
      member.providerMemberId,
      `${field}.tribe.members[${index}].providerMemberId`
    );
    if (ids.has(id)) {
      throw new TypeError(`${field}.tribe.members must not contain duplicate providerMemberId values`);
    }
    ids.add(id);
  }
  return { tribeKey, snapshotId, ids };
}

/**
 * Compare two normalized snapshots without issuing membership mutations.
 * Tribe identity is cluster-scoped; grid/server identify the observation source.
 */
export function diffTribeMembershipSnapshots(previousSnapshot, nextSnapshot) {
  const previous = snapshotMembers(previousSnapshot, "previousSnapshot");
  const next = snapshotMembers(nextSnapshot, "nextSnapshot");
  if (previous.tribeKey !== next.tribeKey) {
    throw new TypeError("snapshots must refer to the same cluster-scoped tribe");
  }

  const joined = [...next.ids].filter((id) => !previous.ids.has(id)).sort();
  const left = [...previous.ids].filter((id) => !next.ids.has(id)).sort();
  const unchanged = [...next.ids].filter((id) => previous.ids.has(id)).sort();

  return Object.freeze({
    tribeKey: next.tribeKey,
    fromSnapshotId: previous.snapshotId,
    toSnapshotId: next.snapshotId,
    joined: Object.freeze(joined),
    left: Object.freeze(left),
    unchanged: Object.freeze(unchanged)
  });
}
