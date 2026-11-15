export type SharePayload = {
  ok?: boolean;
  scenario?: string;
  policySql?: string;
  detail?: string;
};

export function shareLoadOutcome(
  scenarioSlug: string,
  input: { invalid?: boolean; error?: string | null; payload?: SharePayload | null },
): { sql: string | null; error: string | null } {
  if (input.invalid) return { sql: null, error: "This share link could not be loaded." };
  if (input.error) return { sql: null, error: input.error };
  const payload = input.payload;
  if (!payload) return { sql: null, error: "This share link could not be loaded." };
  if (payload.ok && payload.scenario === scenarioSlug && typeof payload.policySql === "string") {
    return { sql: payload.policySql, error: null };
  }
  if (payload.ok && payload.scenario && payload.scenario !== scenarioSlug) {
    return { sql: null, error: `This snapshot belongs to ${payload.scenario}.` };
  }
  return { sql: null, error: payload.detail ?? "This share link could not be loaded." };
}
