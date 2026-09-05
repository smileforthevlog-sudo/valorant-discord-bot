import type {
  AppearanceAssetManifest,
  AssetSourceProvider,
  ThemeAssetSet,
} from "../appearance/assetManifest";

import {
  createEmptyAssetManifest,
} from "../appearance/assetManifest";

const DEFAULT_MANIFEST_URL =
  "https://amazing-quokka-76fd8d.netlify.app/assets/valorant/appearance-assets.json";

const DEFAULT_CACHE_TTL_MS =
  15 * 60 * 1000;

const DEFAULT_TIMEOUT_MS =
  5_000;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isHttpsUrl(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  try {
    return (
      new URL(
        value
      ).protocol === "https:"
    );
  } catch {
    return false;
  }
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

function parseUrlRecord(
  value: unknown
): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const output:
    Record<string, string> = {};

  for (
    const [
      key,
      candidate,
    ] of Object.entries(
      value
    )
  ) {
    if (
      key &&
      isHttpsUrl(
        candidate
      )
    ) {
      output[key] =
        candidate;
    }
  }

  return output;
}

function parseThemes(
  value: unknown
): AppearanceAssetManifest["themes"] {
  if (!isRecord(value)) {
    return {};
  }

  const themes:
    AppearanceAssetManifest["themes"] = {};

  for (
    const [
      preset,
      candidate,
    ] of Object.entries(
      value
    )
  ) {
    if (!isRecord(candidate)) {
      continue;
    }

    const parsed:
      ThemeAssetSet = {};

    if (
      isHttpsUrl(
        candidate.headerUrl
      )
    ) {
      parsed.headerUrl =
        candidate.headerUrl;
    }

    if (
      isHttpsUrl(
        candidate.largeImageUrl
      )
    ) {
      parsed.largeImageUrl =
        candidate.largeImageUrl;
    }

    if (
      isHttpsUrl(
        candidate.footerIconUrl
      )
    ) {
      parsed.footerIconUrl =
        candidate.footerIconUrl;
    }

    if (
      isHttpsUrl(
        candidate.leaderboardBannerUrl
      )
    ) {
      parsed.leaderboardBannerUrl =
        candidate.leaderboardBannerUrl;
    }

    themes[
      preset as keyof typeof themes
    ] = parsed;
  }

  return themes;
}

function parseManifest(
  value: unknown
): AppearanceAssetManifest | null {
  if (
    !isRecord(value) ||
    value.version !== 1
  ) {
    return null;
  }

  const source =
    isRecord(
      value.source
    )
      ? value.source
      : {};

  const provider =
    parseProvider(
      source.provider
    );

  if (!provider) {
    return null;
  }

  const components =
    isRecord(
      source.components
    )
      ? source.components
      : null;

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
            components: {
              ...(typeof components.agents ===
              "string"
                ? {
                    agents:
                      components.agents,
                  }
                : {}),

              ...(typeof components.ranks ===
              "string"
                ? {
                    ranks:
                      components.ranks,
                  }
                : {}),

              ...(typeof components.themes ===
              "string"
                ? {
                    themes:
                      components.themes,
                  }
                : {}),
            },
          }
        : {}),
    },

    ranks:
      parseUrlRecord(
        value.ranks
      ),

    agents:
      parseUrlRecord(
        value.agents
      ),

    themes:
      parseThemes(
        value.themes
      ),
  };
}

export type AppearanceAssetManifestServiceStatus =
  | "ready"
  | "not_configured";

export class AppearanceAssetManifestService {
  private cachedManifest:
    AppearanceAssetManifest =
      createEmptyAssetManifest();

  private cachedAt =
    0;

  constructor(
    private readonly manifestUrl =
      process.env.COSMETICS_ASSET_MANIFEST_URL ??
      DEFAULT_MANIFEST_URL,

    private readonly cacheTtlMs =
      DEFAULT_CACHE_TTL_MS
  ) {}

  getStatus():
    AppearanceAssetManifestServiceStatus {
    return this.manifestUrl
      ? "ready"
      : "not_configured";
  }

  getManifestUrl():
    string {
    return this.manifestUrl;
  }

  clearCache():
    void {
    this.cachedAt = 0;
  }

  async getManifest():
    Promise<AppearanceAssetManifest> {
    if (
      !this.manifestUrl
    ) {
      return this.cachedManifest;
    }

    const now =
      Date.now();

    if (
      this.cachedAt > 0 &&
      now -
        this.cachedAt <
        this.cacheTtlMs
    ) {
      return this.cachedManifest;
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        DEFAULT_TIMEOUT_MS
      );

    try {
      const response =
        await fetch(
          this.manifestUrl,
          {
            headers: {
              Accept:
                "application/json",
            },

            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const parsed =
        parseManifest(
          await response.json()
        );

      if (!parsed) {
        throw new Error(
          "invalid manifest payload"
        );
      }

      this.cachedManifest =
        parsed;

      this.cachedAt =
        now;

      return parsed;
    } catch (error) {
      console.warn(
        "Cosmetics asset manifest fetch failed; using the last cached manifest:",
        error instanceof Error
          ? error.message
          : error
      );

      // Avoid hammering the public site if it is temporarily unavailable.
      this.cachedAt =
        now;

      return this.cachedManifest;
    } finally {
      clearTimeout(
        timeout
      );
    }
  }
}

export const appearanceAssetManifestService =
  new AppearanceAssetManifestService();
