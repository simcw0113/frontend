export type SessionUser = {
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile_image: string | null;
  // Present only when the profile payload already includes a referral / invite code.
  referral_code: string | null;
  // Optional POST /info fields (backend may omit them on older payloads).
  user_id: string | null; // member `code`, e.g. MW0IPC
  birthday: string | null;
  phone_verified: boolean | null;
  total_bets: number | null;
  total_wagered: number | null;
  total_wins: number | null;
};

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
    referral_code:
      asOptionalString(record.referral_code) ??
      asOptionalString(record.referralCode) ??
      asOptionalString(record.invite_code) ??
      asOptionalString(record.inviteCode) ??
      asOptionalString(record.affiliate_code) ??
      asOptionalString(record.affiliateCode) ??
      asOptionalString(record.refer_code),
    user_id: asOptionalString(record.user_id),
    birthday: asOptionalString(record.birthday),
    phone_verified: asOptionalBoolean(record.phone_verified),
    total_bets: asOptionalNumber(record.total_bets),
    total_wagered: asOptionalNumber(record.total_wagered),
    total_wins: asOptionalNumber(record.total_wins),
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
