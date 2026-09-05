import type {
  AppearanceV2,
} from "./types";

import type {
  ResolvedEmbedAssets,
} from "./renderer";

// --------------------------------------------------
// Cosmetics V2 asset-resolution contract
// --------------------------------------------------
//
// Phase 2 defines the contract only.
//
// Later phases will provide concrete resolvers for:
// - VALORANT rank emblems
// - VALORANT agent portraits
// - theme header / banner artwork
// - server icons
// - administrator-uploaded custom images
//
// Keeping resolution outside the renderer prevents
// Discord embed code from depending on any one image
// host or Riot asset source.
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
