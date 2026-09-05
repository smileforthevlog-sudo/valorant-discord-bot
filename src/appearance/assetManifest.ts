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

  ranks: Partial<
    Record<
      ValorantRankTier,
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
