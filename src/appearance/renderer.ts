import {
  EmbedBuilder,
} from "discord.js";

import {
  normalizeHexColor,
} from "./defaults";

import type {
  AppearanceV2,
} from "./types";

// --------------------------------------------------
// Cosmetics V2 Discord embed renderer
// --------------------------------------------------
//
// This module converts a canonical AppearanceV2 object
// plus player/comparison data into Discord embeds.
//
// Asset selection is intentionally kept separate. A later
// phase will resolve rank emblems, agent portraits, theme
// banners, and custom-upload URLs, then pass the final URLs
// into the renderer through ResolvedEmbedAssets.
// --------------------------------------------------

export type ResolvedEmbedAssets = {
  thumbnailUrl?: string | null;
  largeImageUrl?: string | null;
  footerIconUrl?: string | null;
  authorIconUrl?: string | null;
};

export type PlayerProfileRenderData = {
  riotName: string;
  riotTag: string;
  discordUsername?: string | null;

  currentRank?: string | null;
  peakRank?: string | null;

  wins?: number | null;
  losses?: number | null;

  kd?: number | null;
  acs?: number | null;
  headshotPercentage?: number | null;

  mainAgents?: string[] | null;

  verified?: boolean;
  verificationText?: string | null;

  mockData?: boolean;
};

export type LinkedProfileRenderData = {
  riotName: string;
  riotTag: string;
  discordUsername?: string | null;
  verificationText: string;
};

export type ComparisonPlayerRenderData = {
  label: string;
  riotName: string;
  riotTag: string;

  currentRank?: string | null;
  kd?: number | null;
  acs?: number | null;

  verified?: boolean;
  verificationText?: string | null;
};

export type ComparisonRenderData = {
  left: ComparisonPlayerRenderData;
  right: ComparisonPlayerRenderData;
};

function accentToNumber(
  appearance: AppearanceV2
): number {
  const normalized =
    normalizeHexColor(
      appearance.colors.accent
    );

  return Number.parseInt(
    normalized.slice(1),
    16
  );
}

function decorateTitle(
  text: string,
  appearance: AppearanceV2
): string {
  switch (
    appearance.typography.titleStyle
  ) {
    case "hearts":
      return `♡ ${text} ♡`;

    case "brackets":
      return `【 ${text} 】`;

    case "sparkles":
      return `✦ ${text} ✦`;

    case "kaomoji":
      return `୨୧ ${text} ୨୧`;

    case "plain":
    default:
      return text;
  }
}

function divider(
  appearance: AppearanceV2
): string {
  switch (
    appearance.typography.dividerStyle
  ) {
    case "heart":
      return " ♡ ";

    case "sparkle":
      return " ✦ ";

    case "dash":
      return " — ";

    case "none":
      return " ";

    case "dot":
    default:
      return " • ";
  }
}

function safeText(
  value: string | null | undefined,
  fallback = "Unavailable"
): string {
  const trimmed =
    value?.trim();

  return trimmed
    ? trimmed
    : fallback;
}

function formatNumber(
  value: number | null | undefined,
  digits?: number
): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "Unavailable";
  }

  return digits === undefined
    ? value.toString()
    : value.toFixed(digits);
}

function buildProfileFields(
  data: PlayerProfileRenderData,
  appearance: AppearanceV2
) {
  const fields: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];

  if (
    appearance.stats.currentRank
  ) {
    fields.push({
      name: "Current Rank",
      value:
        safeText(
          data.currentRank
        ),
      inline: true,
    });
  }

  if (
    appearance.stats.peakRank
  ) {
    fields.push({
      name: "Peak Rank",
      value:
        safeText(
          data.peakRank
        ),
      inline: true,
    });
  }

  const wins =
    data.wins ?? null;
  const losses =
    data.losses ?? null;

  if (
    appearance.stats.winRate
  ) {
    const total =
      wins !== null &&
      losses !== null
        ? wins + losses
        : 0;

    const winRate =
      total > 0 &&
      wins !== null
        ? (
            (wins / total) *
            100
          ).toFixed(1)
        : null;

    fields.push({
      name: "Win Rate",
      value:
        winRate !== null
          ? `${winRate}%`
          : "Unavailable",
      inline: true,
    });
  }

  if (
    appearance.stats.record
  ) {
    fields.push({
      name: "Record",
      value:
        wins !== null &&
        losses !== null
          ? `${wins}W${divider(
              appearance
            )}${losses}L`
          : "Unavailable",
      inline: true,
    });
  }

  if (
    appearance.stats.kd
  ) {
    fields.push({
      name: "K/D",
      value:
        formatNumber(
          data.kd,
          2
        ),
      inline: true,
    });
  }

  if (
    appearance.stats.acs
  ) {
    fields.push({
      name: "ACS",
      value:
        formatNumber(
          data.acs
        ),
      inline: true,
    });
  }

  if (
    appearance.stats.headshotPercentage
  ) {
    const value =
      data.headshotPercentage;

    fields.push({
      name: "Headshot %",
      value:
        value === null ||
        value === undefined ||
        Number.isNaN(value)
          ? "Unavailable"
          : `${value}%`,
      inline: true,
    });
  }

  if (
    appearance.stats.mainAgents
  ) {
    const agents =
      data.mainAgents?.filter(
        Boolean
      ) ?? [];

    fields.push({
      name: "Main Agents",
      value:
        agents.length > 0
          ? agents.join(
              divider(
                appearance
              )
            )
          : "Unavailable",
      inline:
        appearance.layout.profile !==
        "minimal",
    });
  }

  if (
    data.verificationText
  ) {
    fields.push({
      name: "Verification",
      value:
        data.verificationText,
      inline: false,
    });
  }

  return fields;
}

function applyCommonVisuals(
  embed: EmbedBuilder,
  appearance: AppearanceV2,
  assets?: ResolvedEmbedAssets
) {
  embed.setColor(
    accentToNumber(
      appearance
    )
  );

  if (
    assets?.thumbnailUrl
  ) {
    embed.setThumbnail(
      assets.thumbnailUrl
    );
  }

  if (
    assets?.largeImageUrl
  ) {
    embed.setImage(
      assets.largeImageUrl
    );
  }

  const footerText =
    appearance.text.footer.trim();

  if (
    footerText ||
    assets?.footerIconUrl
  ) {
    const footerData = assets?.footerIconUrl
      ? {
          text:
            footerText ||
            "Valorant Tracker Bot",
          iconURL:
            assets.footerIconUrl,
        }
      : {
          text:
            footerText ||
            "Valorant Tracker Bot",
        };

    embed.setFooter(
      footerData
    );
  }

  if (
    appearance.effects.timestamp
  ) {
    embed.setTimestamp();
  }

  return embed;
}

export function buildProfileEmbedV2(
  data: PlayerProfileRenderData,
  appearance: AppearanceV2,
  assets?: ResolvedEmbedAssets
): EmbedBuilder {
  const riotId =
    `${data.riotName}#${data.riotTag}`;

  const embed =
    new EmbedBuilder()
      .setTitle(
        decorateTitle(
          riotId,
          appearance
        )
      );

  if (
    data.discordUsername
  ) {
    const description =
      appearance.layout.profile ===
      "minimal"
        ? `Profile for **${data.discordUsername}**`
        : `VALORANT profile for **${data.discordUsername}**`;

    embed.setDescription(
      description
    );
  }

  const fields =
    buildProfileFields(
      data,
      appearance
    );

  if (
    fields.length > 0
  ) {
    embed.addFields(
      ...fields
    );
  }

  applyCommonVisuals(
    embed,
    appearance,
    assets
  );

  if (
    data.mockData
  ) {
    const currentFooter =
      appearance.text.footer.trim();

    const mockFooterData =
      assets?.footerIconUrl
        ? {
            text:
              currentFooter
                ? `${currentFooter} • Mock Data`
                : "Mock Data",
            iconURL:
              assets.footerIconUrl,
          }
        : {
            text:
              currentFooter
                ? `${currentFooter} • Mock Data`
                : "Mock Data",
          };

    embed.setFooter(
      mockFooterData
    );
  }

  return embed;
}

export function buildLinkedProfileEmbedV2(
  data: LinkedProfileRenderData,
  appearance: AppearanceV2,
  assets?: ResolvedEmbedAssets
): EmbedBuilder {
  const riotId =
    `${data.riotName}#${data.riotTag}`;

  const embed =
    new EmbedBuilder()
      .setTitle(
        decorateTitle(
          riotId,
          appearance
        )
      );

  if (
    data.discordUsername
  ) {
    const description =
      appearance.layout.profile ===
      "minimal"
        ? `Profile for **${data.discordUsername}**`
        : `VALORANT profile for **${data.discordUsername}**`;

    embed.setDescription(
      description
    );
  }

  embed.addFields(
    {
      name: "Riot ID",
      value:
        `**${riotId}**`,
      inline: true,
    },
    {
      name: "Verification",
      value:
        data.verificationText,
      inline: true,
    }
  );

  return applyCommonVisuals(
    embed,
    appearance,
    assets
  );
}

function comparisonSummary(
  player: ComparisonPlayerRenderData,
  appearance: AppearanceV2
): string {
  const parts = [
    `**${player.riotName}#${player.riotTag}**`,
  ];

  if (
    appearance.stats.currentRank &&
    player.currentRank
  ) {
    parts.push(
      `Rank: ${player.currentRank}`
    );
  }

  if (
    appearance.stats.kd &&
    player.kd !== null &&
    player.kd !== undefined
  ) {
    parts.push(
      `K/D: ${player.kd.toFixed(2)}`
    );
  }

  if (
    appearance.stats.acs &&
    player.acs !== null &&
    player.acs !== undefined
  ) {
    parts.push(
      `ACS: ${player.acs}`
    );
  }

  const verificationText =
    player.verificationText?.trim();

  parts.push(
    verificationText
      ? verificationText
      : player.verified
        ? "Riot verified"
        : "Manual link"
  );

  return parts.join(
    "\n"
  );
}

export function buildComparisonEmbedV2(
  data: ComparisonRenderData,
  appearance: AppearanceV2,
  assets?: ResolvedEmbedAssets
): EmbedBuilder {
  const title =
    appearance.layout.compare ===
    "minimal"
      ? "Player Comparison"
      : "VALORANT Player Comparison";

  const embed =
    new EmbedBuilder()
      .setTitle(
        decorateTitle(
          title,
          appearance
        )
      )
      .setDescription(
        `**${data.left.label}**${divider(
          appearance
        )}vs${divider(
          appearance
        )}**${data.right.label}**`
      )
      .addFields(
        {
          name:
            data.left.label,
          value:
            comparisonSummary(
              data.left,
              appearance
            ),
          inline: true,
        },
        {
          name:
            appearance.typography.dividerStyle ===
            "heart"
              ? "♡"
              : "VS",
          value:
            appearance.typography.dividerStyle ===
            "sparkle"
              ? "✦"
              : "vs",
          inline: true,
        },
        {
          name:
            data.right.label,
          value:
            comparisonSummary(
              data.right,
              appearance
            ),
          inline: true,
        }
      );

  return applyCommonVisuals(
    embed,
    appearance,
    assets
  );
}
