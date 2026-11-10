export type SessionUser = {
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile_image: string | null;
};

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fromRecord(record: Record<string, unknown>): SessionUser | null {
  const username = asOptionalString(record.username);
  if (!username) return null;
  return {
    username,
    full_name: asOptionalString(record.full_name),
    email: asOptionalString(record.email),
    phone: asOptionalString(record.phone),
    profile_image: asOptionalString(record.profile_image),
  };
}

export function readSessionUser(payload: unknown): SessionUser | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (data.user && typeof data.user === "object") {
      const nested = fromRecord(data.user as Record<string, unknown>);
      if (nested) return nested;
    }
    const fromData = fromRecord(data);
    if (fromData) return fromData;
  }

  if (record.user && typeof record.user === "object") {
    const fromUser = fromRecord(record.user as Record<string, unknown>);
    if (fromUser) return fromUser;
  }

  return fromRecord(record);
}
