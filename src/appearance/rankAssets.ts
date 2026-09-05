import type {
  ValorantRankKey,
  ValorantRankTier,
} from "./assetManifest";

const TIER_PATTERNS: Array<{
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
    TIER_PATTERNS
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

export function normalizeRankKey(
  rankName:
    | string
    | null
    | undefined
): ValorantRankKey | null {
  const tier =
    normalizeRankTier(
      rankName
    );

  if (!tier) {
    return null;
  }

  if (
    tier === "radiant"
  ) {
    return "radiant";
  }

  const raw =
    rankName?.trim() ?? "";

  const divisionMatch =
    raw.match(
      /\b([123])\b/
    );

  if (!divisionMatch) {
    return null;
  }

  return `${tier}${divisionMatch[1]}` as
    ValorantRankKey;
}
