import type {
  ValorantRankTier,
} from "./assetManifest";

const RANK_PATTERNS: Array<{
  pattern: RegExp;
  tier: ValorantRankTier;
}> = [
  {
    pattern:
      /\bradiant\b/i,
    tier: "radiant",
  },
  {
    pattern:
      /\bimmortal\b/i,
    tier: "immortal",
  },
  {
    pattern:
      /\bascendant\b/i,
    tier: "ascendant",
  },
  {
    pattern:
      /\bdiamond\b/i,
    tier: "diamond",
  },
  {
    pattern:
      /\bplatinum\b/i,
    tier: "platinum",
  },
  {
    pattern:
      /\bgold\b/i,
    tier: "gold",
  },
  {
    pattern:
      /\bsilver\b/i,
    tier: "silver",
  },
  {
    pattern:
      /\bbronze\b/i,
    tier: "bronze",
  },
  {
    pattern:
      /\biron\b/i,
    tier: "iron",
  },
];

export function normalizeRankTier(
  rankName:
    | string
    | null
    | undefined
): ValorantRankTier | null {
  if (!rankName) {
    return null;
  }

  const normalized =
    rankName.trim();

  if (
    !normalized ||
    /^(unranked|unrated|unknown|n\/a)$/i.test(
      normalized
    )
  ) {
    return null;
  }

  for (
    const entry of
    RANK_PATTERNS
  ) {
    if (
      entry.pattern.test(
        normalized
      )
    ) {
      return entry.tier;
    }
  }

  return null;
}
