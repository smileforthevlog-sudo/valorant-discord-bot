import {
  createDefaultAppearanceV2,
} from "../src/appearance/defaults";

import type {
  AppearanceAssetManifest,
} from "../src/appearance/assetManifest";

import {
  ManifestAppearanceAssetResolver,
} from "../src/appearance/assets";

import {
  normalizeRankTier,
} from "../src/appearance/rankAssets";

import {
  normalizeAgentKey,
} from "../src/appearance/agentAssets";

async function main() {
  function assert(
    condition: unknown,
    message: string
  ): asserts condition {
    if (!condition) {
      throw new Error(
        `Asset self-test failed: ${message}`
      );
    }
  }

  assert(
    normalizeRankTier(
      "Diamond 2"
    ) === "diamond",
    "Diamond 2 should normalize to diamond"
  );

  assert(
    normalizeRankTier(
      "IMMORTAL 3"
    ) === "immortal",
    "Immortal 3 should normalize to immortal"
  );

  assert(
    normalizeRankTier(
      "Unranked"
    ) === null,
    "Unranked should not resolve to an emblem"
  );

  assert(
    normalizeAgentKey(
      "KAY/O"
    ) === "kayo",
    "KAY/O should normalize to kayo"
  );

  assert(
    normalizeAgentKey(
      "  Jett "
    ) === "jett",
    "Jett should normalize to jett"
  );

  const manifest:
    AppearanceAssetManifest = {
      version: 1,

      source: {
        provider:
          "riot-public-content-catalog",
        release: "self-test",
      },

      ranks: {
        diamond:
          "https://assets.example.test/ranks/diamond.png",
      },

      agents: {
        jett:
          "https://assets.example.test/agents/jett.png",
      },

      themes: {
        cute: {
          headerUrl:
            "https://assets.example.test/themes/cute-header.png",
          footerIconUrl:
            "https://assets.example.test/themes/cute-footer.png",
          leaderboardBannerUrl:
            "https://assets.example.test/themes/cute-leaderboard.png",
        },
      },
    };

  const resolver =
    new ManifestAppearanceAssetResolver(
      manifest
    );

  const rankAppearance =
    createDefaultAppearanceV2();

  rankAppearance.images.thumbnail.mode =
    "rank";

  rankAppearance.images.largeImage.mode =
    "theme";

  rankAppearance.images.footerIcon.mode =
    "theme";

  const rankAssets =
    await resolver.resolveProfileAssets(
      rankAppearance,
      {
        currentRank:
          "Diamond 2",
        mainAgent:
          "Jett",
      }
    );

  assert(
    rankAssets.thumbnailUrl ===
      "https://assets.example.test/ranks/diamond.png",
    "rank thumbnail should resolve"
  );

  assert(
    rankAssets.largeImageUrl ===
      "https://assets.example.test/themes/cute-header.png",
    "theme large image should fall back to theme header"
  );

  assert(
    rankAssets.footerIconUrl ===
      "https://assets.example.test/themes/cute-footer.png",
    "theme footer icon should resolve"
  );

  const agentAppearance =
    createDefaultAppearanceV2();

  agentAppearance.images.thumbnail.mode =
    "agent";

  const agentAssets =
    await resolver.resolveProfileAssets(
      agentAppearance,
      {
        currentRank:
          "Diamond 2",
        mainAgent:
          "Jett",
      }
    );

  assert(
    agentAssets.thumbnailUrl ===
      "https://assets.example.test/agents/jett.png",
    "agent portrait should resolve"
  );

  agentAppearance.images.thumbnail.mode =
    "custom";

  agentAppearance.customAssets.thumbnailUrl =
    "https://uploads.example.test/my-thumbnail.webp";

  const customAssets =
    await resolver.resolveProfileAssets(
      agentAppearance,
      {
        currentRank:
          "Diamond 2",
        mainAgent:
          "Jett",
      }
    );

  assert(
    customAssets.thumbnailUrl ===
      "https://uploads.example.test/my-thumbnail.webp",
    "custom thumbnail should override built-in assets when selected"
  );

  console.log(
    "Cosmetics V2 Phase 4A asset self-test passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
