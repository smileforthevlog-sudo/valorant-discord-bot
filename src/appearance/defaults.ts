import type {
  AppearanceV2,
  DividerStyle,
  EmojiStyle,
  LegacyAppearanceSettings,
  ProfileLayout,
  ThemePreset,
  TitleStyle,
} from "./types";

const SIX_DIGIT_HEX =
  /^#[0-9A-F]{6}$/;

export function intToHexColor(
  value: number
): string {
  const safeValue =
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffffff
      ? value
      : 0xffb6c1;

  return `#${safeValue
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

export function normalizeHexColor(
  value: unknown,
  fallback = "#FFB6C1"
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized =
    value.trim().toUpperCase();

  if (
    SIX_DIGIT_HEX.test(
      normalized
    )
  ) {
    return normalized;
  }

  return fallback;
}

export function createDefaultAppearanceV2():
  AppearanceV2 {
  return {
    version: 2,

    preset: "cute",

    colors: {
      accent: "#FFB6C1",
    },

    typography: {
      titleStyle: "hearts",
      dividerStyle: "heart",
    },

    layout: {
      profile: "detailed",
      compare: "detailed",
    },

    effects: {
      emojiStyle: "cute",
      timestamp: false,
    },

    stats: {
      currentRank: true,
      peakRank: true,
      record: true,
      winRate: true,
      kd: true,
      acs: true,
      headshotPercentage: true,
      mainAgents: true,
    },

    images: {
      thumbnail: {
        mode: "rank",
      },

      largeImage: {
        mode: "theme",
      },

      footerIcon: {
        mode: "none",
      },

      header: {
        mode: "theme",
      },
    },

    customAssets: {
      thumbnailUrl: null,
      largeImageUrl: null,
      footerIconUrl: null,
      headerUrl: null,
      leaderboardBannerUrl: null,
    },

    text: {
      footer:
        "Valorant Tracker Bot ♡",
    },
  };
}

function legacyPreset(
  style: string
): ThemePreset {
  if (style === "classic") {
    return "classic";
  }

  if (style === "minimal") {
    return "minimal";
  }

  return "cute";
}

function legacyTitleStyle(
  style: string
): TitleStyle {
  return style === "cute"
    ? "hearts"
    : "plain";
}

function legacyDividerStyle(
  style: string
): DividerStyle {
  if (style === "cute") {
    return "heart";
  }

  if (style === "minimal") {
    return "none";
  }

  return "dot";
}

function legacyLayout(
  style: string
): ProfileLayout {
  return style === "minimal"
    ? "minimal"
    : "detailed";
}

function legacyEmojiStyle(
  value: string
): EmojiStyle {
  if (
    value === "normal" ||
    value === "none"
  ) {
    return value;
  }

  return "cute";
}

export function appearanceV2FromLegacy(
  legacy: LegacyAppearanceSettings
): AppearanceV2 {
  const appearance =
    createDefaultAppearanceV2();

  appearance.preset =
    legacyPreset(
      legacy.style
    );

  appearance.colors.accent =
    intToHexColor(
      legacy.embedColor
    );

  appearance.typography.titleStyle =
    legacyTitleStyle(
      legacy.style
    );

  appearance.typography.dividerStyle =
    legacyDividerStyle(
      legacy.style
    );

  appearance.layout.profile =
    legacyLayout(
      legacy.style
    );

  appearance.layout.compare =
    legacyLayout(
      legacy.style
    );

  appearance.effects.emojiStyle =
    legacyEmojiStyle(
      legacy.emojiStyle
    );

  if (
    legacy.footerText.trim()
  ) {
    appearance.text.footer =
      legacy.footerText.trim();
  }

  return appearance;
}
