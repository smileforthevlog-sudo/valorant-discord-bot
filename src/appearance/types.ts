// --------------------------------------------------
// Cosmetics V2 canonical appearance schema
// --------------------------------------------------
//
// This file is intentionally UI-agnostic. Discord commands,
// the web dashboard, and future image renderers should all
// converge on this same shape.
//
// Phase 1 only defines the contract. The live bot still uses
// the existing V1 guild settings until we explicitly switch
// rendering over in a later phase.
// --------------------------------------------------

export type ThemePreset =
  | "cute"
  | "sakura"
  | "midnight"
  | "cyber"
  | "classic"
  | "minimal"
  | "radiant";

export type TitleStyle =
  | "plain"
  | "hearts"
  | "brackets"
  | "sparkles"
  | "kaomoji";

export type DividerStyle =
  | "dot"
  | "heart"
  | "sparkle"
  | "dash"
  | "none";

export type ProfileLayout =
  | "detailed"
  | "compact"
  | "minimal";

export type EmojiStyle =
  | "cute"
  | "normal"
  | "none";

export type ThumbnailMode =
  | "rank"
  | "agent"
  | "custom"
  | "server"
  | "none";

export type LargeImageMode =
  | "theme"
  | "custom"
  | "agent"
  | "leaderboard"
  | "none";

export type FooterIconMode =
  | "theme"
  | "custom"
  | "server"
  | "none";

export type HeaderMode =
  | "theme"
  | "custom"
  | "none";

export type AppearanceV2 = {
  version: 2;

  preset: ThemePreset;

  colors: {
    accent: string;
  };

  typography: {
    titleStyle: TitleStyle;
    dividerStyle: DividerStyle;
  };

  layout: {
    profile: ProfileLayout;
    compare: ProfileLayout;
  };

  effects: {
    emojiStyle: EmojiStyle;
    timestamp: boolean;
  };

  stats: {
    currentRank: boolean;
    peakRank: boolean;
    record: boolean;
    winRate: boolean;
    kd: boolean;
    acs: boolean;
    headshotPercentage: boolean;
    mainAgents: boolean;
  };

  images: {
    thumbnail: {
      mode: ThumbnailMode;
    };

    largeImage: {
      mode: LargeImageMode;
    };

    footerIcon: {
      mode: FooterIconMode;
    };

    header: {
      mode: HeaderMode;
    };
  };

  customAssets: {
    thumbnailUrl: string | null;
    largeImageUrl: string | null;
    footerIconUrl: string | null;
    headerUrl: string | null;
    leaderboardBannerUrl: string | null;
  };

  text: {
    footer: string;
  };
};

export type LegacyAppearanceSettings = {
  style: string;
  embedColor: number;
  footerText: string;
  emojiStyle: string;
};
