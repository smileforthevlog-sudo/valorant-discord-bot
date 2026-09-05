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
  normalizeRankKey,
  normalizeRankTier,
} from "../src/appearance/rankAssets";

import {
  normalizeAgentKey,
} from "../src/appearance/agentAssets";

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

async function main() {
  assert(
    normalizeRankTier(
      "Diamond 2"
    ) === "diamond",
    "Diamond 2 should normalize to diamond"
  );

  assert(
    normalizeRankKey(
      "Diamond 2"
    ) === "diamond2",
    "Diamond 2 should normalize to diamond2"
  );

  assert(
    normalizeRankKey(
      "Immortal 3"
    ) === "immortal3",
    "Immortal 3 should normalize to immortal3"
  );

  assert(
    normalizeRankKey(
      "Radiant"
    ) === "radiant",
    "Radiant should normalize to radiant"
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

  const manifest:
    AppearanceAssetManifest = {
      version: 1,

      source: {
        provider:
          "riot-public-content-catalog",
        release: "self-test",
      },

      ranks: {
        diamond2:
          "https://assets.example.test/ranks/diamond2.png",
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
        },
      },
    };

  const resolver =
    new ManifestAppearanceAssetResolver(
      manifest
    );

  const appearance =
    createDefaultAppearanceV2();

  appearance.images.thumbnail.mode =
    "rank";

  appearance.images.largeImage.mode =
    "theme";

  appearance.images.footerIcon.mode =
    "theme";

  const exactAssets =
    await resolver.resolveProfileAssets(
      appearance,
      {
        currentRank:
          "Diamond 2",
        mainAgent:
          "Jett",
      }
    );

  assert(
    exactAssets.thumbnailUrl ===
      "https://assets.example.test/ranks/diamond2.png",
    "exact rank division should be preferred"
  );

  const fallbackManifest:
    AppearanceAssetManifest = {
      ...manifest,
      ranks: {
        diamond:
          "https://assets.example.test/ranks/diamond.png",
      },
    };

  const fallbackResolver =
    new ManifestAppearanceAssetResolver(
      fallbackManifest
    );

  const fallbackAssets =
    await fallbackResolver.resolveProfileAssets(
      appearance,
      {
        currentRank:
          "Diamond 2",
      }
    );

  assert(
    fallbackAssets.thumbnailUrl ===
      "https://assets.example.test/ranks/diamond.png",
    "generic tier should remain a fallback"
  );

  appearance.images.thumbnail.mode =
    "agent";

  const agentAssets =
    await resolver.resolveProfileAssets(
      appearance,
      {
        mainAgent:
          "Jett",
      }
    );

  assert(
    agentAssets.thumbnailUrl ===
      "https://assets.example.test/agents/jett.png",
    "agent portrait should resolve"
  );

  console.log(
    "Cosmetics V2 Phase 4B asset self-test passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
