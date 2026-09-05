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
  source?: "default" | "saved";
};

type DashboardSettingsResponse = {
  settings?: DashboardGuildSettings;
};

class DashboardSettingsService {
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

      if (!data.settings) {
        return null;
      }

      return data.settings;
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
