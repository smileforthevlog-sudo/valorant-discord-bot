import type {
  ThemePreset,
} from "./types";

export type ValorantRankTier =
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "ascendant"
  | "immortal"
  | "radiant";

export type ValorantRankKey =
  | "iron1"
  | "iron2"
  | "iron3"
  | "bronze1"
  | "bronze2"
  | "bronze3"
  | "silver1"
  | "silver2"
  | "silver3"
  | "gold1"
  | "gold2"
  | "gold3"
  | "platinum1"
  | "platinum2"
  | "platinum3"
  | "diamond1"
  | "diamond2"
  | "diamond3"
  | "ascendant1"
  | "ascendant2"
  | "ascendant3"
  | "immortal1"
  | "immortal2"
  | "immortal3"
  | "radiant";

export type ThemeAssetSet = {
  headerUrl?: string;
  largeImageUrl?: string;
  footerIconUrl?: string;
  leaderboardBannerUrl?: string;
};

export type AppearanceAssetManifest = {
  version: 1;

  source: {
    provider:
      | "riot-public-content-catalog"
      | "local"
      | "custom";

    release?: string;
    generatedAt?: string;
  };

  // Exact competitive divisions are preferred (diamond2, immortal3, etc.).
  // Generic tier keys are retained as a fallback so older manifests still work.
  ranks: Partial<
    Record<
      ValorantRankKey | ValorantRankTier,
      string
    >
  >;

  agents: Record<
    string,
    string
  >;

  themes: Partial<
    Record<
      ThemePreset,
      ThemeAssetSet
    >
  >;
};

export function createEmptyAssetManifest():
  AppearanceAssetManifest {
  return {
    version: 1,

    source: {
      provider:
        "riot-public-content-catalog",
    },

    ranks: {},

    agents: {},

    themes: {},
  };
}
