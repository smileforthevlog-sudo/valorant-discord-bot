import type {
  AppearanceV2,
} from "./types";

import type {
  ResolvedEmbedAssets,
} from "./renderer";

import type {
  AppearanceAssetManifest,
  ThemeAssetSet,
} from "./assetManifest";

import {
  normalizeAgentKey,
} from "./agentAssets";

import {
  normalizeRankKey,
  normalizeRankTier,
} from "./rankAssets";

// --------------------------------------------------
// Cosmetics V2 asset-resolution engine
// --------------------------------------------------
//
// Exact competitive rank emblems are preferred.
// Example: "Diamond 2" -> ranks.diamond2.
// If an exact division image is unavailable, the resolver
// falls back to ranks.diamond for compatibility.
// --------------------------------------------------

export type PlayerVisualContext = {
  guildId?: string | null;
  currentRank?: string | null;
  mainAgent?: string | null;
  serverIconUrl?: string | null;
};

export interface AppearanceAssetResolver {
  resolveProfileAssets(
    appearance: AppearanceV2,
    context: PlayerVisualContext
  ): Promise<ResolvedEmbedAssets>;

  resolveComparisonAssets(
    appearance: AppearanceV2,
    context: {
      guildId?: string | null;
      serverIconUrl?: string | null;
    }
  ): Promise<ResolvedEmbedAssets>;
}

function cleanHttpsUrl(
  value:
    | string
    | null
    | undefined
): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed =
      new URL(
        value.trim()
      );

    return parsed.protocol ===
      "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function getThemeAssets(
  manifest:
    AppearanceAssetManifest,
  appearance:
    AppearanceV2
): ThemeAssetSet {
  return (
    manifest.themes[
      appearance.preset
    ] ?? {}
  );
}

function rankUrl(
  manifest:
    AppearanceAssetManifest,
  rankName:
    | string
    | null
    | undefined
): string | null {
  const exactKey =
    normalizeRankKey(
      rankName
    );

  if (exactKey) {
    const exact =
      cleanHttpsUrl(
        manifest.ranks[
          exactKey
        ]
      );

    if (exact) {
      return exact;
    }
  }

  const tier =
    normalizeRankTier(
      rankName
    );

  if (!tier) {
    return null;
  }

  return cleanHttpsUrl(
    manifest.ranks[tier]
  );
}

function agentUrl(
  manifest:
    AppearanceAssetManifest,
  agentName:
    | string
    | null
    | undefined
): string | null {
  const key =
    normalizeAgentKey(
      agentName
    );

  if (!key) {
    return null;
  }

  return cleanHttpsUrl(
    manifest.agents[key]
  );
}

function resolveProfileThumbnail(
  manifest:
    AppearanceAssetManifest,
  appearance:
    AppearanceV2,
  context:
    PlayerVisualContext
): string | null {
  switch (
    appearance.images.thumbnail.mode
  ) {
    case "rank":
      return rankUrl(
        manifest,
        context.currentRank
      );

    case "agent":
      return agentUrl(
        manifest,
        context.mainAgent
      );

    case "custom":
      return cleanHttpsUrl(
        appearance.customAssets
          .thumbnailUrl
      );

    case "server":
      return cleanHttpsUrl(
        context.serverIconUrl
      );

    case "none":
    default:
      return null;
  }
}

function resolveProfileLargeImage(
  manifest:
    AppearanceAssetManifest,
  appearance:
    AppearanceV2,
  context:
    PlayerVisualContext
): string | null {
  const theme =
    getThemeAssets(
      manifest,
      appearance
    );

  let resolved:
    | string
    | null = null;

  switch (
    appearance.images.largeImage.mode
  ) {
    case "theme":
      resolved =
        cleanHttpsUrl(
          theme.largeImageUrl ??
            theme.headerUrl
        );
      break;

    case "custom":
      resolved =
        cleanHttpsUrl(
          appearance.customAssets
            .largeImageUrl
        );
      break;

    case "agent":
      resolved =
        agentUrl(
          manifest,
          context.mainAgent
        );
      break;

    case "leaderboard":
      resolved =
        cleanHttpsUrl(
          appearance.customAssets
            .leaderboardBannerUrl ??
            theme.leaderboardBannerUrl
        );
      break;

    case "none":
      resolved = null;
      break;
  }

  if (resolved) {
    return resolved;
  }

  switch (
    appearance.images.header.mode
  ) {
    case "theme":
      return cleanHttpsUrl(
        theme.headerUrl
      );

    case "custom":
      return cleanHttpsUrl(
        appearance.customAssets
          .headerUrl
      );

    case "none":
    default:
      return null;
  }
}

function resolveFooterIcon(
  manifest:
    AppearanceAssetManifest,
  appearance:
    AppearanceV2,
  serverIconUrl:
    | string
    | null
    | undefined
): string | null {
  const theme =
    getThemeAssets(
      manifest,
      appearance
    );

  switch (
    appearance.images.footerIcon.mode
  ) {
    case "theme":
      return cleanHttpsUrl(
        theme.footerIconUrl
      );

    case "custom":
      return cleanHttpsUrl(
        appearance.customAssets
          .footerIconUrl
      );

    case "server":
      return cleanHttpsUrl(
        serverIconUrl
      );

    case "none":
    default:
      return null;
  }
}

export class ManifestAppearanceAssetResolver
  implements AppearanceAssetResolver {
  constructor(
    private readonly manifest:
      AppearanceAssetManifest
  ) {}

  async resolveProfileAssets(
    appearance: AppearanceV2,
    context: PlayerVisualContext
  ): Promise<ResolvedEmbedAssets> {
    return {
      thumbnailUrl:
        resolveProfileThumbnail(
          this.manifest,
          appearance,
          context
        ),

      largeImageUrl:
        resolveProfileLargeImage(
          this.manifest,
          appearance,
          context
        ),

      footerIconUrl:
        resolveFooterIcon(
          this.manifest,
          appearance,
          context.serverIconUrl
        ),
    };
  }

  async resolveComparisonAssets(
    appearance: AppearanceV2,
    context: {
      guildId?: string | null;
      serverIconUrl?: string | null;
    }
  ): Promise<ResolvedEmbedAssets> {
    const theme =
      getThemeAssets(
        this.manifest,
        appearance
      );

    let largeImageUrl:
      | string
      | null = null;

    switch (
      appearance.images.largeImage.mode
    ) {
      case "theme":
        largeImageUrl =
          cleanHttpsUrl(
            theme.largeImageUrl ??
              theme.headerUrl
          );
        break;

      case "custom":
        largeImageUrl =
          cleanHttpsUrl(
            appearance.customAssets
              .largeImageUrl
          );
        break;

      case "leaderboard":
        largeImageUrl =
          cleanHttpsUrl(
            appearance.customAssets
              .leaderboardBannerUrl ??
              theme.leaderboardBannerUrl
          );
        break;

      case "agent":
      case "none":
        largeImageUrl =
          null;
        break;
    }

    if (!largeImageUrl) {
      if (
        appearance.images.header.mode ===
        "theme"
      ) {
        largeImageUrl =
          cleanHttpsUrl(
            theme.headerUrl
          );
      } else if (
        appearance.images.header.mode ===
        "custom"
      ) {
        largeImageUrl =
          cleanHttpsUrl(
            appearance.customAssets
              .headerUrl
          );
      }
    }

    const thumbnailUrl =
      appearance.images.thumbnail.mode ===
      "server"
        ? cleanHttpsUrl(
            context.serverIconUrl
          )
        : appearance.images.thumbnail.mode ===
          "custom"
          ? cleanHttpsUrl(
              appearance.customAssets
                .thumbnailUrl
            )
          : null;

    return {
      thumbnailUrl,

      largeImageUrl,

      footerIconUrl:
        resolveFooterIcon(
          this.manifest,
          appearance,
          context.serverIconUrl
        ),
    };
  }
}

export class EmptyAppearanceAssetResolver
  implements AppearanceAssetResolver {
  async resolveProfileAssets():
    Promise<ResolvedEmbedAssets> {
    return {};
  }

  async resolveComparisonAssets():
    Promise<ResolvedEmbedAssets> {
    return {};
  }
}

export const emptyAppearanceAssetResolver =
  new EmptyAppearanceAssetResolver();
