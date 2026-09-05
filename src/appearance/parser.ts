import {
  createDefaultAppearanceV2,
  normalizeHexColor,
} from "./defaults";

import type {
  AppearanceV2,
  DividerStyle,
  EmojiStyle,
  FooterIconMode,
  HeaderMode,
  LargeImageMode,
  ProfileLayout,
  ThemePreset,
  ThumbnailMode,
  TitleStyle,
} from "./types";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
  fallback: T
): T {
  return (
    typeof value === "string" &&
    choices.includes(value as T)
  )
    ? (value as T)
    : fallback;
}

function booleanValue(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function nullableUrl(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed =
      new URL(trimmed);

    if (
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

const PRESETS = [
  "cute",
  "sakura",
  "midnight",
  "cyber",
  "classic",
  "minimal",
  "radiant",
] as const satisfies readonly ThemePreset[];

const TITLE_STYLES = [
  "plain",
  "hearts",
  "brackets",
  "sparkles",
  "kaomoji",
] as const satisfies readonly TitleStyle[];

const DIVIDER_STYLES = [
  "dot",
  "heart",
  "sparkle",
  "dash",
  "none",
] as const satisfies readonly DividerStyle[];

const LAYOUTS = [
  "detailed",
  "compact",
  "minimal",
] as const satisfies readonly ProfileLayout[];

const EMOJI_STYLES = [
  "cute",
  "normal",
  "none",
] as const satisfies readonly EmojiStyle[];

const THUMBNAIL_MODES = [
  "rank",
  "agent",
  "custom",
  "server",
  "none",
] as const satisfies readonly ThumbnailMode[];

const LARGE_IMAGE_MODES = [
  "theme",
  "custom",
  "agent",
  "leaderboard",
  "none",
] as const satisfies readonly LargeImageMode[];

const FOOTER_ICON_MODES = [
  "theme",
  "custom",
  "server",
  "none",
] as const satisfies readonly FooterIconMode[];

const HEADER_MODES = [
  "theme",
  "custom",
  "none",
] as const satisfies readonly HeaderMode[];

export function normalizeAppearanceV2(
  raw: unknown
): AppearanceV2 {
  const defaults =
    createDefaultAppearanceV2();

  if (!isRecord(raw)) {
    return defaults;
  }

  const colors =
    isRecord(raw.colors)
      ? raw.colors
      : {};

  const typography =
    isRecord(raw.typography)
      ? raw.typography
      : {};

  const layout =
    isRecord(raw.layout)
      ? raw.layout
      : {};

  const effects =
    isRecord(raw.effects)
      ? raw.effects
      : {};

  const stats =
    isRecord(raw.stats)
      ? raw.stats
      : {};

  const images =
    isRecord(raw.images)
      ? raw.images
      : {};

  const thumbnail =
    isRecord(images.thumbnail)
      ? images.thumbnail
      : {};

  const largeImage =
    isRecord(images.largeImage)
      ? images.largeImage
      : {};

  const footerIcon =
    isRecord(images.footerIcon)
      ? images.footerIcon
      : {};

  const header =
    isRecord(images.header)
      ? images.header
      : {};

  const customAssets =
    isRecord(raw.customAssets)
      ? raw.customAssets
      : {};

  const text =
    isRecord(raw.text)
      ? raw.text
      : {};

  return {
    version: 2,

    preset:
      stringChoice(
        raw.preset,
        PRESETS,
        defaults.preset
      ),

    colors: {
      accent:
        normalizeHexColor(
          colors.accent,
          defaults.colors.accent
        ),
    },

    typography: {
      titleStyle:
        stringChoice(
          typography.titleStyle,
          TITLE_STYLES,
          defaults.typography.titleStyle
        ),

      dividerStyle:
        stringChoice(
          typography.dividerStyle,
          DIVIDER_STYLES,
          defaults.typography.dividerStyle
        ),
    },

    layout: {
      profile:
        stringChoice(
          layout.profile,
          LAYOUTS,
          defaults.layout.profile
        ),

      compare:
        stringChoice(
          layout.compare,
          LAYOUTS,
          defaults.layout.compare
        ),
    },

    effects: {
      emojiStyle:
        stringChoice(
          effects.emojiStyle,
          EMOJI_STYLES,
          defaults.effects.emojiStyle
        ),

      timestamp:
        booleanValue(
          effects.timestamp,
          defaults.effects.timestamp
        ),
    },

    stats: {
      currentRank:
        booleanValue(
          stats.currentRank,
          defaults.stats.currentRank
        ),

      peakRank:
        booleanValue(
          stats.peakRank,
          defaults.stats.peakRank
        ),

      record:
        booleanValue(
          stats.record,
          defaults.stats.record
        ),

      winRate:
        booleanValue(
          stats.winRate,
          defaults.stats.winRate
        ),

      kd:
        booleanValue(
          stats.kd,
          defaults.stats.kd
        ),

      acs:
        booleanValue(
          stats.acs,
          defaults.stats.acs
        ),

      headshotPercentage:
        booleanValue(
          stats.headshotPercentage,
          defaults.stats.headshotPercentage
        ),

      mainAgents:
        booleanValue(
          stats.mainAgents,
          defaults.stats.mainAgents
        ),
    },

    images: {
      thumbnail: {
        mode:
          stringChoice(
            thumbnail.mode,
            THUMBNAIL_MODES,
            defaults.images.thumbnail.mode
          ),
      },

      largeImage: {
        mode:
          stringChoice(
            largeImage.mode,
            LARGE_IMAGE_MODES,
            defaults.images.largeImage.mode
          ),
      },

      footerIcon: {
        mode:
          stringChoice(
            footerIcon.mode,
            FOOTER_ICON_MODES,
            defaults.images.footerIcon.mode
          ),
      },

      header: {
        mode:
          stringChoice(
            header.mode,
            HEADER_MODES,
            defaults.images.header.mode
          ),
      },
    },

    customAssets: {
      thumbnailUrl:
        nullableUrl(
          customAssets.thumbnailUrl
        ),

      largeImageUrl:
        nullableUrl(
          customAssets.largeImageUrl
        ),

      footerIconUrl:
        nullableUrl(
          customAssets.footerIconUrl
        ),

      headerUrl:
        nullableUrl(
          customAssets.headerUrl
        ),

      leaderboardBannerUrl:
        nullableUrl(
          customAssets.leaderboardBannerUrl
        ),
    },

    text: {
      footer:
        typeof text.footer === "string" &&
        text.footer.trim()
          ? text.footer
              .trim()
              .slice(0, 120)
          : defaults.text.footer,
    },
  };
}

export function parseAppearanceV2(
  value: string | null | undefined
): AppearanceV2 | null {
  if (!value) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(value) as unknown;

    if (
      !isRecord(parsed) ||
      parsed.version !== 2
    ) {
      return null;
    }

    return normalizeAppearanceV2(
      parsed
    );
  } catch {
    return null;
  }
}

export function stringifyAppearanceV2(
  appearance: AppearanceV2
): string {
  return JSON.stringify(
    normalizeAppearanceV2(
      appearance
    )
  );
}
