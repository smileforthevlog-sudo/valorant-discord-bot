export function normalizeAgentKey(
  agentName:
    | string
    | null
    | undefined
): string | null {
  if (!agentName) {
    return null;
  }

  const normalized =
    agentName
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        ""
      );

  return normalized
    ? normalized
    : null;
}
