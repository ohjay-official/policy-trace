export function labSearch(current: string, identity: string, chip: string | null): string {
  const params = new URLSearchParams(current);
  params.set("as", identity);
  if (chip) params.set("chip", chip);
  else params.delete("chip");
  return params.toString();
}
