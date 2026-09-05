import {
  readFileSync,
} from "node:fs";

import type {
  AppearanceAssetManifest,
  AssetSourceProvider,
} from "./assetManifest";

import {
  createEmptyAssetManifest,
} from "./assetManifest";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseProvider(
  value: unknown
): AssetSourceProvider | null {
  switch (value) {
    case "riot-public-content-catalog":
    case "local":
    case "custom":
    case "mixed":
      return value;

    default:
      return null;
  }
}

function parseComponents(
  value: unknown
):
  | NonNullable<
      AppearanceAssetManifest["source"]["components"]
    >
  | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const components:
    NonNullable<
      AppearanceAssetManifest["source"]["components"]
    > = {};

  if (
    typeof value.agents ===
      "string"
  ) {
    components.agents =
      value.agents;
  }

  if (
    typeof value.ranks ===
      "string"
  ) {
    components.ranks =
      value.ranks;
  }

  if (
    typeof value.themes ===
      "string"
  ) {
    components.themes =
      value.themes;
  }

  return Object.keys(
    components
  ).length > 0
    ? components
    : undefined;
}

export function loadAppearanceAssetManifest(
  filePath:
    | string
    | null
    | undefined
): AppearanceAssetManifest {
  if (!filePath) {
    return createEmptyAssetManifest();
  }

  try {
    const raw =
      readFileSync(
        filePath,
        "utf8"
      );

    const parsed =
      JSON.parse(
        raw
      ) as unknown;

    if (
      !isRecord(parsed) ||
      parsed.version !== 1
    ) {
      throw new Error(
        "Unsupported asset manifest version."
      );
    }

    const ranks =
      isRecord(parsed.ranks)
        ? parsed.ranks
        : {};

    const agents =
      isRecord(parsed.agents)
        ? parsed.agents
        : {};

    const themes =
      isRecord(parsed.themes)
        ? parsed.themes
        : {};

    const source =
      isRecord(parsed.source)
        ? parsed.source
        : {};

    const provider =
      parseProvider(
        source.provider
      );

    if (!provider) {
      throw new Error(
        "Invalid asset manifest provider."
      );
    }

    const components =
      parseComponents(
        source.components
      );

    return {
      version: 1,

      source: {
        provider,

        ...(typeof source.release ===
        "string"
          ? {
              release:
                source.release,
            }
          : {}),

        ...(typeof source.generatedAt ===
        "string"
          ? {
              generatedAt:
                source.generatedAt,
            }
          : {}),

        ...(components
          ? {
              components,
            }
          : {}),
      },

      ranks:
        ranks as AppearanceAssetManifest["ranks"],

      agents:
        agents as AppearanceAssetManifest["agents"],

      themes:
        themes as AppearanceAssetManifest["themes"],
    };
  } catch (error) {
    console.warn(
      "Appearance asset manifest could not be loaded:",
      error instanceof Error
        ? error.message
        : error
    );

    return createEmptyAssetManifest();
  }
}
