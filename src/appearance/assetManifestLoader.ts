import {
  readFileSync,
} from "node:fs";

import type {
  AppearanceAssetManifest,
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
      source.provider;

    if (
      provider !==
        "riot-public-content-catalog" &&
      provider !== "local" &&
      provider !== "custom"
    ) {
      throw new Error(
        "Invalid asset manifest provider."
      );
    }

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
