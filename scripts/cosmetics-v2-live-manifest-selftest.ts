import {
  ManifestAppearanceAssetResolver,
} from "../src/appearance/assets";

import {
  createDefaultAppearanceV2,
} from "../src/appearance/defaults";

import {
  AppearanceAssetManifestService,
} from "../src/services/appearanceAssetManifest";

function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(
      `Live manifest self-test failed: ${message}`
    );
  }
}

async function main() {
  const service =
    new AppearanceAssetManifestService();

  const manifest =
    await service.getManifest();

  const agentCount =
    Object.keys(
      manifest.agents
    ).length;

  const rankCount =
    Object.keys(
      manifest.ranks
    ).length;

  assert(
    agentCount >= 20,
    `expected at least 20 agents, got ${agentCount}`
  );

  assert(
    rankCount >= 25,
    `expected at least 25 ranks, got ${rankCount}`
  );

  assert(
    typeof manifest.agents.jett ===
      "string",
    "Jett URL is missing"
  );

  assert(
    typeof manifest.ranks.diamond2 ===
      "string",
    "Diamond 2 URL is missing"
  );

  assert(
    typeof manifest.ranks.radiant ===
      "string",
    "Radiant URL is missing"
  );

  const appearance =
    createDefaultAppearanceV2();

  appearance.images.thumbnail.mode =
    "rank";

  const resolver =
    new ManifestAppearanceAssetResolver(
      manifest
    );

  const rankAssets =
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
    rankAssets.thumbnailUrl ===
      manifest.ranks.diamond2,
    "Diamond 2 did not resolve to the live rank URL"
  );

  appearance.images.thumbnail.mode =
    "agent";

  const agentAssets =
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
    agentAssets.thumbnailUrl ===
      manifest.agents.jett,
    "Jett did not resolve to the live agent URL"
  );

  console.log("");
  console.log(
    "Cosmetics V2 Phase 6A live manifest self-test passed."
  );
  console.log(
    `Live agents: ${agentCount}`
  );
  console.log(
    `Live ranks: ${rankCount}`
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
