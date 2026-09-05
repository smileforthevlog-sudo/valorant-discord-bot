import {
  parseAppearanceV2,
} from "../appearance/parser";

import type {
  AppearanceV2,
} from "../appearance/types";

export type DashboardStyle =
  | "cute"
  | "classic"
  | "minimal";

export type DashboardEmojiStyle =
  | "cute"
  | "normal"
  | "none";

export type DashboardGuildSettings = {
  style: DashboardStyle;
  embedColor: number;
  footerText: string;
  emojiStyle: DashboardEmojiStyle;

  // Cosmetics V2.
  // Older dashboard records may not contain this yet.
  appearance?: AppearanceV2;

  source?: "default" | "saved";
};

type DashboardSettingsResponse = {
  settings?: unknown;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseStyle(
  value: unknown
): DashboardStyle | null {
  switch (value) {
    case "cute":
    case "classic":
    case "minimal":
      return value;

    default:
      return null;
  }
}

function parseEmojiStyle(
  value: unknown
): DashboardEmojiStyle | null {
  switch (value) {
    case "cute":
    case "normal":
    case "none":
      return value;

    default:
      return null;
  }
}

function parseAppearance(
  value: unknown
): AppearanceV2 | undefined {
  if (
    !isRecord(value) ||
    value.version !== 2
  ) {
    return undefined;
  }

  try {
    return (
      parseAppearanceV2(
        JSON.stringify(
          value
        )
      ) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export function parseDashboardGuildSettings(
  value: unknown
): DashboardGuildSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const style =
    parseStyle(
      value.style
    );

  const emojiStyle =
    parseEmojiStyle(
      value.emojiStyle
    );

  if (
    !style ||
    !emojiStyle ||
    typeof value.embedColor !==
      "number" ||
    !Number.isInteger(
      value.embedColor
    ) ||
    value.embedColor < 0 ||
    value.embedColor > 0xffffff ||
    typeof value.footerText !==
      "string"
  ) {
    return null;
  }

  const source =
    value.source ===
      "default" ||
    value.source ===
      "saved"
      ? value.source
      : undefined;

  const appearance =
    parseAppearance(
      value.appearance
    );

  return {
    style,
    embedColor:
      value.embedColor,
    footerText:
      value.footerText,
    emojiStyle,

    ...(appearance
      ? {
          appearance,
        }
      : {}),

    ...(source
      ? {
          source,
        }
      : {}),
  };
}

export class DashboardSettingsService {
  private get baseUrl(): string | null {
    return (
      process.env.DASHBOARD_SETTINGS_URL?.trim() ||
      null
    );
  }

  private get syncSecret(): string | null {
    return (
      process.env.BOT_SYNC_SECRET?.trim() ||
      null
    );
  }

  getStatus():
    | "ready"
    | "not_configured" {
    return this.baseUrl &&
      this.syncSecret
      ? "ready"
      : "not_configured";
  }

  async getGuildSettings(
    guildId: string
  ): Promise<DashboardGuildSettings | null> {
    const baseUrl = this.baseUrl;
    const syncSecret = this.syncSecret;

    if (!baseUrl || !syncSecret) {
      return null;
    }

    try {
      const url = new URL(baseUrl);

      url.searchParams.set(
        "guild_id",
        guildId
      );

      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${syncSecret}`,
            Accept:
              "application/json",
          },
          signal:
            AbortSignal.timeout(
              5000
            ),
        }
      );

      if (!response.ok) {
        console.warn(
          `Dashboard settings GET failed with HTTP ${response.status}.`
        );

        return null;
      }

      const data =
        (await response.json()) as
          DashboardSettingsResponse;

      const settings =
        parseDashboardGuildSettings(
          data.settings
        );

      if (!settings) {
        console.warn(
          "Dashboard settings GET returned an invalid settings payload."
        );

        return null;
      }

      return settings;
    } catch (error) {
      console.warn(
        "Dashboard settings GET failed:",
        error instanceof Error
          ? error.message
          : error
      );

      return null;
    }
  }

  async saveGuildSettings(
    guildId: string,
    settings: DashboardGuildSettings
  ): Promise<boolean> {
    const baseUrl = this.baseUrl;
    const syncSecret = this.syncSecret;

    if (!baseUrl || !syncSecret) {
      return false;
    }

    try {
      const url = new URL(baseUrl);

      url.searchParams.set(
        "guild_id",
        guildId
      );

      const response = await fetch(
        url,
        {
          method: "PUT",
          headers: {
            Authorization:
              `Bearer ${syncSecret}`,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            style:
              settings.style,
            embedColor:
              settings.embedColor,
            footerText:
              settings.footerText,
            emojiStyle:
              settings.emojiStyle,

            ...(settings.appearance
              ? {
                  appearance:
                    settings.appearance,
                }
              : {}),
          }),

          signal:
            AbortSignal.timeout(
              5000
            ),
        }
      );

      if (!response.ok) {
        console.warn(
          `Dashboard settings PUT failed with HTTP ${response.status}.`
        );

        return false;
      }

      return true;
    } catch (error) {
      console.warn(
        "Dashboard settings PUT failed:",
        error instanceof Error
          ? error.message
          : error
      );

      return false;
    }
  }
}

export const dashboardSettingsService =
  new DashboardSettingsService();
