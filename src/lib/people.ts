export const ALICE_ID = "11111111-1111-1111-1111-111111111111";
export const BOB_ID = "22222222-2222-2222-2222-222222222222";
export const CAROL_ID = "33333333-3333-3333-3333-333333333333";
export const TEAM_ACME = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const TEAM_OTHER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const PEOPLE: Record<string, string> = {
  [ALICE_ID]: "Alice",
  [BOB_ID]: "Bob",
  [CAROL_ID]: "Carol",
};

const TEAMS: Record<string, string> = {
  [TEAM_ACME]: "Acme",
  [TEAM_OTHER]: "Other",
};

export function personName(id: string | null | undefined): string | null {
  if (!id) return null;
  return PEOPLE[id] ?? null;
}

export function teamName(id: string | null | undefined): string | null {
  if (!id) return null;
  return TEAMS[id] ?? null;
}

const FIELD_LABELS: Record<string, string> = {
  owner_id: "Owner",
  team_id: "Team",
  title: "Title",
  body: "Body",
  status: "Status",
  secret: "Secret",
  amount: "Amount",
  id: "Id",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function formatField(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    if (key === "team_id") return "Personal";
    return "null";
  }
  const text = String(value);
  if (key === "owner_id") {
    const name = personName(text);
    return name ? `${name} · ${text}` : text;
  }
  if (key === "team_id") {
    const name = teamName(text);
    return name ? `${name} · ${text}` : text;
  }
  return text;
}
