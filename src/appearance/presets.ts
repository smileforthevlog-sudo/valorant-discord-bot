import {
  createDefaultAppearanceV2,
  normalizeHexColor,
} from "./defaults";

import type {
  AppearanceV2,
  ThemePreset,
} from "./types";

// --------------------------------------------------
// Cosmetics V2 theme presets
// --------------------------------------------------
//
// Presets are starting points, not locks. The dashboard
// can apply a preset and then override any individual
// property afterward.
// --------------------------------------------------

type PresetDefinition = {
  label: string;
  description: string;
  accent: string;
  titleStyle:
    AppearanceV2["typography"]["titleStyle"];
  dividerStyle:
    AppearanceV2["typography"]["dividerStyle"];
  profileLayout:
    AppearanceV2["layout"]["profile"];
  compareLayout:
    AppearanceV2["layout"]["compare"];
  emojiStyle:
    AppearanceV2["effects"]["emojiStyle"];
  timestamp: boolean;
  thumbnailMode:
    AppearanceV2["images"]["thumbnail"]["mode"];
  largeImageMode:
    AppearanceV2["images"]["largeImage"]["mode"];
  footerIconMode:
    AppearanceV2["images"]["footerIcon"]["mode"];
  headerMode:
    AppearanceV2["images"]["header"]["mode"];
  footer: string;
};

export const THEME_PRESETS: Record<
  ThemePreset,
  PresetDefinition
> = {
  cute: {
    label: "Cute",
    description:
      "Soft pink styling with hearts and playful decorations.",
    accent: "#FFB6C1",
    titleStyle: "hearts",
    dividerStyle: "heart",
    profileLayout: "detailed",
    compareLayout: "detailed",
    emojiStyle: "cute",
    timestamp: false,
    thumbnailMode: "rank",
    largeImageMode: "theme",
    footerIconMode: "none",
    headerMode: "theme",
    footer: "Valorant Tracker Bot ♡",
  },

  sakura: {
    label: "Sakura",
    description:
      "Cherry-blossom inspired styling with soft decorative details.",
    accent: "#F6A6C1",
    titleStyle: "sparkles",
    dividerStyle: "heart",
    profileLayout: "detailed",
    compareLayout: "detailed",
    emojiStyle: "cute",
    timestamp: false,
    thumbnailMode: "agent",
    largeImageMode: "theme",
    footerIconMode: "theme",
    headerMode: "theme",
    footer: "good luck, have fun ♡",
  },

  midnight: {
    label: "Midnight",
    description:
      "Dark blue-purple styling with restrained decorative accents.",
    accent: "#7C83FD",
    titleStyle: "brackets",
    dividerStyle: "dash",
    profileLayout: "detailed",
    compareLayout: "detailed",
    emojiStyle: "normal",
    timestamp: true,
    thumbnailMode: "rank",
    largeImageMode: "theme",
    footerIconMode: "none",
    headerMode: "theme",
    footer: "Valorant Tracker Bot",
  },

  cyber: {
    label: "Cyber",
    description:
      "Neon competitive styling with sharp technical presentation.",
    accent: "#00E5FF",
    titleStyle: "brackets",
    dividerStyle: "sparkle",
    profileLayout: "compact",
    compareLayout: "compact",
    emojiStyle: "normal",
    timestamp: true,
    thumbnailMode: "agent",
    largeImageMode: "theme",
    footerIconMode: "theme",
    headerMode: "theme",
    footer: "VALORANT // TRACKER",
  },

  classic: {
    label: "Classic",
    description:
      "Clean competitive styling inspired by the existing bot.",
    accent: "#FF4655",
    titleStyle: "plain",
    dividerStyle: "dot",
    profileLayout: "detailed",
    compareLayout: "detailed",
    emojiStyle: "normal",
    timestamp: false,
    thumbnailMode: "rank",
    largeImageMode: "none",
    footerIconMode: "none",
    headerMode: "none",
    footer: "Valorant Tracker Bot",
  },

  minimal: {
    label: "Minimal",
    description:
      "Low-decoration layout focused almost entirely on player data.",
    accent: "#B5BAC1",
    titleStyle: "plain",
    dividerStyle: "none",
    profileLayout: "minimal",
    compareLayout: "minimal",
    emojiStyle: "none",
    timestamp: false,
    thumbnailMode: "none",
    largeImageMode: "none",
    footerIconMode: "none",
    headerMode: "none",
    footer: "Valorant Tracker Bot",
  },

  radiant: {
    label: "Radiant",
    description:
      "Prestige-focused gold styling intended for rank-heavy profiles.",
    accent: "#F2C94C",
    titleStyle: "sparkles",
    dividerStyle: "sparkle",
    profileLayout: "detailed",
    compareLayout: "detailed",
    emojiStyle: "normal",
    timestamp: true,
    thumbnailMode: "rank",
    largeImageMode: "theme",
    footerIconMode: "theme",
    headerMode: "theme",
    footer: "Radiant Series • Valorant Tracker Bot",
  },
};

export function applyThemePreset(
  preset: ThemePreset,
  current?: AppearanceV2
): AppearanceV2 {
  const base =
    current
      ? structuredClone(current)
      : createDefaultAppearanceV2();

  const definition =
    THEME_PRESETS[preset];

  base.version = 2;
  base.preset = preset;

  base.colors.accent =
    normalizeHexColor(
      definition.accent
    );

  base.typography.titleStyle =
    definition.titleStyle;

  base.typography.dividerStyle =
    definition.dividerStyle;

  base.layout.profile =
    definition.profileLayout;

  base.layout.compare =
    definition.compareLayout;

  base.effects.emojiStyle =
    definition.emojiStyle;

  base.effects.timestamp =
    definition.timestamp;

  base.images.thumbnail.mode =
    definition.thumbnailMode;

  base.images.largeImage.mode =
    definition.largeImageMode;

  base.images.footerIcon.mode =
    definition.footerIconMode;

  base.images.header.mode =
    definition.headerMode;

  base.text.footer =
    definition.footer;

  return base;
}

export function listThemePresets() {
  return Object.entries(
    THEME_PRESETS
  ).map(
    ([id, definition]) => ({
      id: id as ThemePreset,
      ...definition,
    })
  );
}
