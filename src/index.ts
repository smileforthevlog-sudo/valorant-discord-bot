import "dotenv/config";

import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { riotService } from "./services/riot";
import { ensureAppearanceV2Column } from "./appearance/migrate";
import { createAppearanceV2Store } from "./appearance/store";
import type { LegacyAppearanceSettings } from "./appearance/types";
import {
  dashboardSettingsService,
  type DashboardGuildSettings,
} from "./services/dashboardSettings";

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

const token =
  process.env.DISCORD_TOKEN;
const clientId =
  process.env.DISCORD_CLIENT_ID;
const guildId =
  process.env.DISCORD_GUILD_ID;

if (!token) {
  throw new Error(
    "DISCORD_TOKEN is missing from .env"
  );
}

if (!clientId) {
  throw new Error(
    "DISCORD_CLIENT_ID is missing from .env"
  );
}

if (!guildId) {
  throw new Error(
    "DISCORD_GUILD_ID is missing from .env"
  );
}

const DISCORD_TOKEN: string =
  token;
const DISCORD_CLIENT_ID: string =
  clientId;
const DISCORD_GUILD_ID: string =
  guildId;

// --------------------------------------------------
// SQLite database
// --------------------------------------------------

const databasePath =
  process.env.DATABASE_PATH ??
  "data/valorant-bot.db";

mkdirSync(
  dirname(databasePath),
  {
    recursive: true,
  }
);

const db =
  new DatabaseSync(
    databasePath
  );

// --------------------------------------------------
// Linked accounts table
// --------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS linked_accounts (
    discord_user_id TEXT PRIMARY KEY,
    riot_name TEXT NOT NULL,
    riot_tag TEXT NOT NULL,
    linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// --------------------------------------------------
// Linked account migrations
// --------------------------------------------------

const linkedAccountColumns =
  db
    .prepare(
      "PRAGMA table_info(linked_accounts)"
    )
    .all() as Array<{
      name: string;
    }>;

if (
  !linkedAccountColumns.some(
    (column) =>
      column.name ===
      "riot_puuid"
  )
) {
  db.exec(`
    ALTER TABLE linked_accounts
    ADD COLUMN riot_puuid TEXT
  `);

  console.log(
    "Database updated: added riot_puuid column."
  );
}

if (
  !linkedAccountColumns.some(
    (column) =>
      column.name ===
      "link_method"
  )
) {
  db.exec(`
    ALTER TABLE linked_accounts
    ADD COLUMN link_method TEXT NOT NULL DEFAULT 'manual'
  `);

  console.log(
    "Database updated: added link_method column."
  );
}

if (
  !linkedAccountColumns.some(
    (column) =>
      column.name ===
      "verified_at"
  )
) {
  db.exec(`
    ALTER TABLE linked_accounts
    ADD COLUMN verified_at TEXT
  `);

  console.log(
    "Database updated: added verified_at column."
  );
}

// --------------------------------------------------
// Per-server settings table
// --------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    style TEXT NOT NULL DEFAULT 'cute',
    embed_color INTEGER NOT NULL DEFAULT 16758465,
    footer_text TEXT NOT NULL DEFAULT 'Valorant Tracker Bot ♡',
    emoji_style TEXT NOT NULL DEFAULT 'cute',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Cosmetics V2 is introduced alongside the existing settings.
// The bot still renders with the V1 fields for now.
ensureAppearanceV2Column(db);

const appearanceV2Store =
  createAppearanceV2Store(db);

// --------------------------------------------------
// Types
// --------------------------------------------------

type LinkedAccount = {
  riot_name: string;
  riot_tag: string;
  riot_puuid: string | null;
  link_method: string;
  verified_at: string | null;
};

type GuildSettings = {
  guild_id: string;
  style: string;
  embed_color: number;
  footer_text: string;
  emoji_style: string;
  updated_at: string;
};

type MockPlayer = {
  riotName: string;
  tag: string;
  currentRank: string;
  peakRank: string;
  wins: number;
  losses: number;
  kd: number;
  acs: number;
  headshotPercentage: number;
  mainAgents: string[];
};

// --------------------------------------------------
// Mock Valorant data
// --------------------------------------------------

const players: Record<
  string,
  MockPlayer
> = {
  jason: {
    riotName: "Tapgod",
    tag: "NA1",
    currentRank:
      "Diamond 2",
    peakRank:
      "Ascendant 1",
    wins: 37,
    losses: 29,
    kd: 1.14,
    acs: 238,
    headshotPercentage:
      27.4,
    mainAgents: [
      "Jett",
      "Omen",
      "Reyna",
    ],
  },

  alex: {
    riotName: "Alex",
    tag: "NA1",
    currentRank:
      "Platinum 3",
    peakRank:
      "Diamond 1",
    wins: 31,
    losses: 29,
    kd: 1.02,
    acs: 219,
    headshotPercentage:
      21.9,
    mainAgents: [
      "Sova",
      "Cypher",
      "Omen",
    ],
  },
};

// --------------------------------------------------
// Linked-account database helpers
// --------------------------------------------------

const saveLinkedAccountStatement =
  db.prepare(`
    INSERT INTO linked_accounts (
      discord_user_id,
      riot_name,
      riot_tag,
      riot_puuid,
      link_method,
      verified_at
    )
    VALUES (?, ?, ?, NULL, 'manual', NULL)

    ON CONFLICT(discord_user_id)
    DO UPDATE SET
      riot_name = excluded.riot_name,
      riot_tag = excluded.riot_tag,
      riot_puuid = NULL,
      link_method = 'manual',
      verified_at = NULL,
      linked_at = CURRENT_TIMESTAMP
  `);

const saveVerifiedLinkedAccountStatement =
  db.prepare(`
    INSERT INTO linked_accounts (
      discord_user_id,
      riot_name,
      riot_tag,
      riot_puuid,
      link_method,
      verified_at
    )
    VALUES (?, ?, ?, ?, 'rso', CURRENT_TIMESTAMP)

    ON CONFLICT(discord_user_id)
    DO UPDATE SET
      riot_name = excluded.riot_name,
      riot_tag = excluded.riot_tag,
      riot_puuid = excluded.riot_puuid,
      link_method = 'rso',
      verified_at = CURRENT_TIMESTAMP,
      linked_at = CURRENT_TIMESTAMP
  `);

const deleteLinkedAccountStatement =
  db.prepare(`
    DELETE FROM linked_accounts
    WHERE discord_user_id = ?
  `);

const getLinkedAccountStatement =
  db.prepare(`
    SELECT
      riot_name,
      riot_tag,
      riot_puuid,
      link_method,
      verified_at
    FROM linked_accounts
    WHERE discord_user_id = ?
  `);

function getLinkedAccount(
  discordUserId: string
): LinkedAccount | undefined {
  return getLinkedAccountStatement.get(
    discordUserId
  ) as
    | LinkedAccount
    | undefined;
}

// --------------------------------------------------
// Guild-settings database helpers
// --------------------------------------------------

const getGuildSettingsStatement =
  db.prepare(`
    SELECT
      guild_id,
      style,
      embed_color,
      footer_text,
      emoji_style,
      updated_at
    FROM guild_settings
    WHERE guild_id = ?
  `);

const createGuildSettingsStatement =
  db.prepare(`
    INSERT OR IGNORE INTO guild_settings (
      guild_id
    )
    VALUES (?)
  `);

const updateGuildStyleStatement =
  db.prepare(`
    UPDATE guild_settings
    SET
      style = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

const updateGuildColorStatement =
  db.prepare(`
    UPDATE guild_settings
    SET
      embed_color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

const updateGuildFooterStatement =
  db.prepare(`
    UPDATE guild_settings
    SET
      footer_text = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

const updateGuildEmojiStatement =
  db.prepare(`
    UPDATE guild_settings
    SET
      emoji_style = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

const resetGuildSettingsStatement =
  db.prepare(`
    DELETE FROM guild_settings
    WHERE guild_id = ?
  `);

const saveSyncedGuildSettingsStatement =
  db.prepare(`
    INSERT INTO guild_settings (
      guild_id,
      style,
      embed_color,
      footer_text,
      emoji_style,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

    ON CONFLICT(guild_id)
    DO UPDATE SET
      style = excluded.style,
      embed_color = excluded.embed_color,
      footer_text = excluded.footer_text,
      emoji_style = excluded.emoji_style,
      updated_at = CURRENT_TIMESTAMP
  `);

function getGuildSettings(
  targetGuildId: string
): GuildSettings {
  createGuildSettingsStatement.run(
    targetGuildId
  );

  const settings =
    getGuildSettingsStatement.get(
      targetGuildId
    ) as GuildSettings;

  // Lazy V1 -> V2 migration:
  // the first time a guild's settings are read,
  // create appearance_json if it is missing or invalid.
  // V1 remains the live renderer source for now.
  appearanceV2Store.getOrCreate(
    targetGuildId,
    toLegacyAppearanceSettings(
      settings
    )
  );

  return settings;
}

function toLegacyAppearanceSettings(
  settings: GuildSettings
): LegacyAppearanceSettings {
  return {
    style:
      settings.style,
    embedColor:
      settings.embed_color,
    footerText:
      settings.footer_text,
    emojiStyle:
      settings.emoji_style,
  };
}

function syncLegacyAppearanceV2(
  settings: GuildSettings
): void {
  appearanceV2Store.syncLegacyFields(
    settings.guild_id,
    toLegacyAppearanceSettings(
      settings
    )
  );
}

function getDefaultGuildSettings():
  GuildSettings {
  return {
    guild_id: "default",
    style: "cute",
    embed_color: 0xffb6c1,
    footer_text:
      "Valorant Tracker Bot ♡",
    emoji_style: "cute",
    updated_at:
      new Date().toISOString(),
  };
}

function saveDashboardSettingsLocally(
  targetGuildId: string,
  settings:
    DashboardGuildSettings
) {
  saveSyncedGuildSettingsStatement.run(
    targetGuildId,
    settings.style,
    settings.embedColor,
    settings.footerText,
    settings.emojiStyle
  );

  const updatedSettings =
    getGuildSettings(
      targetGuildId
    );

  syncLegacyAppearanceV2(
    updatedSettings
  );
}

function toDashboardSettings(
  settings: GuildSettings
): DashboardGuildSettings {
  return {
    style:
      getStyle(settings),
    embedColor:
      settings.embed_color,
    footerText:
      settings.footer_text,
    emojiStyle:
      getEmojiStyle(settings),
  };
}

async function getSyncedGuildSettings(
  targetGuildId: string
): Promise<GuildSettings> {
  const localSettings =
    getGuildSettings(
      targetGuildId
    );

  const remoteSettings =
    await dashboardSettingsService.getGuildSettings(
      targetGuildId
    );

  if (!remoteSettings) {
    return localSettings;
  }

  // If the dashboard has never saved settings
  // for this server, seed it from the bot's
  // existing SQLite settings instead of
  // overwriting the bot with remote defaults.
  if (
    remoteSettings.source ===
    "default"
  ) {
    await dashboardSettingsService.saveGuildSettings(
      targetGuildId,
      toDashboardSettings(
        localSettings
      )
    );

    return localSettings;
  }

  saveDashboardSettingsLocally(
    targetGuildId,
    remoteSettings
  );

  return getGuildSettings(
    targetGuildId
  );
}

async function pushGuildSettings(
  settings: GuildSettings
) {
  // Until the dashboard itself speaks Cosmetics V2,
  // mirror V1-compatible changes into appearance_json.
  // V2-only fields such as stat visibility and custom
  // asset URLs are preserved by syncLegacyFields().
  syncLegacyAppearanceV2(
    settings
  );

  await dashboardSettingsService.saveGuildSettings(
    settings.guild_id,
    toDashboardSettings(
      settings
    )
  );
}

// --------------------------------------------------
// Theme helpers
// --------------------------------------------------

function getStyle(
  settings: GuildSettings
): "cute" | "classic" | "minimal" {
  if (
    settings.style ===
      "classic" ||
    settings.style ===
      "minimal"
  ) {
    return settings.style;
  }

  return "cute";
}

function getEmojiStyle(
  settings: GuildSettings
):
  | "cute"
  | "normal"
  | "none" {
  if (
    settings.emoji_style ===
      "normal" ||
    settings.emoji_style ===
      "none"
  ) {
    return settings.emoji_style;
  }

  return "cute";
}

function getIcon(
  settings: GuildSettings,
  type:
    | "profile"
    | "compare"
    | "verified"
    | "warning"
    | "ping"
    | "settings"
): string {
  const emojiStyle =
    getEmojiStyle(
      settings
    );

  if (
    emojiStyle === "none"
  ) {
    return "";
  }

  if (
    emojiStyle === "normal"
  ) {
    const normalIcons = {
      profile: "🎯",
      compare: "⚔️",
      verified: "✅",
      warning: "⚠️",
      ping: "🏓",
      settings: "⚙️",
    };

    return normalIcons[
      type
    ];
  }

  const cuteIcons = {
    profile: "♡",
    compare: "୨୧",
    verified: "♡",
    warning: "♡",
    ping: "♡",
    settings: "୨୧",
  };

  return cuteIcons[
    type
  ];
}

function withIcon(
  icon: string,
  text: string
): string {
  return icon
    ? `${icon} ${text}`
    : text;
}

function getAgentSeparator(
  settings: GuildSettings
): string {
  const style =
    getStyle(settings);

  if (
    style === "cute"
  ) {
    return " ♡ ";
  }

  if (
    style === "minimal"
  ) {
    return ", ";
  }

  return " • ";
}

function getProfileDescription(
  settings: GuildSettings,
  username: string
): string {
  const style =
    getStyle(settings);

  if (
    style === "cute"
  ) {
    return `୨୧ Valorant profile for **${username}** ୨୧`;
  }

  if (
    style === "minimal"
  ) {
    return `Profile for **${username}**`;
  }

  return `Valorant profile for **${username}**`;
}

function getCompareTitle(
  settings: GuildSettings
): string {
  const style =
    getStyle(settings);

  if (
    style === "cute"
  ) {
    return withIcon(
      getIcon(
        settings,
        "compare"
      ),
      "Player Matchup"
    );
  }

  if (
    style === "minimal"
  ) {
    return "Player Comparison";
  }

  return withIcon(
    getIcon(
      settings,
      "compare"
    ),
    "Valorant Player Comparison"
  );
}

function getVerificationText(
  settings: GuildSettings,
  verified: boolean
): string {
  if (verified) {
    return withIcon(
      getIcon(
        settings,
        "verified"
      ),
      "Riot verified"
    );
  }

  return withIcon(
    getIcon(
      settings,
      "warning"
    ),
    "Manual link — not Riot verified"
  );
}

function buildSettingsEmbed(
  settings: GuildSettings
): EmbedBuilder {
  const hexColor =
    `#${settings.embed_color
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()}`;

  return new EmbedBuilder()
    .setColor(
      settings.embed_color
    )
    .setTitle(
      withIcon(
        getIcon(
          settings,
          "settings"
        ),
        "Server Bot Settings"
      )
    )
    .setDescription(
      "These settings control how the bot looks in this server."
    )
    .addFields(
      {
        name: "Style",
        value:
          settings.style,
        inline: true,
      },
      {
        name:
          "Embed Color",
        value:
          hexColor,
        inline: true,
      },
      {
        name:
          "Emoji Style",
        value:
          settings.emoji_style,
        inline: true,
      },
      {
        name: "Footer",
        value:
          settings.footer_text,
        inline: false,
      }
    )
    .setFooter({
      text:
        "Server customization settings",
    });
}

// --------------------------------------------------
// Slash commands
// --------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Check whether the bot is online"
    ),

  new SlashCommandBuilder()
    .setName("link")
    .setDescription(
      "Link your Discord account to a Riot ID"
    )
    .addStringOption(
      (option) =>
        option
          .setName(
            "riot_id"
          )
          .setDescription(
            "Your Riot ID, for example Tapgod#NA1"
          )
          .setRequired(
            true
          )
    ),

  new SlashCommandBuilder()
    .setName("unlink")
    .setDescription(
      "Unlink your Riot account from Discord"
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription(
      "View a Valorant player profile"
    )
    .addStringOption(
      (option) =>
        option
          .setName(
            "player"
          )
          .setDescription(
            "Choose a mock player"
          )
          .setRequired(
            false
          )
          .addChoices(
            {
              name:
                "Jason",
              value:
                "jason",
            },
            {
              name:
                "Alex",
              value:
                "alex",
            }
          )
    )
    .addUserOption(
      (option) =>
        option
          .setName(
            "user"
          )
          .setDescription(
            "View a linked Discord user's Valorant profile"
          )
          .setRequired(
            false
          )
    ),

  new SlashCommandBuilder()
    .setName("settings")
    .setDescription(
      "View or change this server's bot settings"
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "view"
          )
          .setDescription(
            "View this server's current bot settings"
          )
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "style"
          )
          .setDescription(
            "Change this server's bot style"
          )
          .addStringOption(
            (option) =>
              option
                .setName(
                  "style"
                )
                .setDescription(
                  "Choose an aesthetic"
                )
                .setRequired(
                  true
                )
                .addChoices(
                  {
                    name:
                      "Cute",
                    value:
                      "cute",
                  },
                  {
                    name:
                      "Classic",
                    value:
                      "classic",
                  },
                  {
                    name:
                      "Minimal",
                    value:
                      "minimal",
                  }
                )
          )
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "color"
          )
          .setDescription(
            "Change the embed accent color"
          )
          .addStringOption(
            (option) =>
              option
                .setName(
                  "hex"
                )
                .setDescription(
                  "Hex color, for example #FFB6C1"
                )
                .setRequired(
                  true
                )
          )
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "footer"
          )
          .setDescription(
            "Change the embed footer text"
          )
          .addStringOption(
            (option) =>
              option
                .setName(
                  "text"
                )
                .setDescription(
                  "Custom footer text"
                )
                .setRequired(
                  true
                )
                .setMinLength(
                  1
                )
                .setMaxLength(
                  120
                )
          )
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "emoji"
          )
          .setDescription(
            "Change the emoji style"
          )
          .addStringOption(
            (option) =>
              option
                .setName(
                  "style"
                )
                .setDescription(
                  "Choose an emoji style"
                )
                .setRequired(
                  true
                )
                .addChoices(
                  {
                    name:
                      "Cute",
                    value:
                      "cute",
                  },
                  {
                    name:
                      "Normal",
                    value:
                      "normal",
                  },
                  {
                    name:
                      "None",
                    value:
                      "none",
                  }
                )
          )
    )
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName(
            "reset"
          )
          .setDescription(
            "Reset this server to the default cute theme"
          )
    ),

  new SlashCommandBuilder()
    .setName("compare")
    .setDescription(
      "Compare two linked Valorant players"
    )
    .addUserOption(
      (option) =>
        option
          .setName(
            "user1"
          )
          .setDescription(
            "First Discord user"
          )
          .setRequired(
            true
          )
    )
    .addUserOption(
      (option) =>
        option
          .setName(
            "user2"
          )
          .setDescription(
            "Second Discord user"
          )
          .setRequired(
            true
          )
    ),
].map(
  (command) =>
    command.toJSON()
);

// --------------------------------------------------
// Discord REST
// --------------------------------------------------

const rest =
  new REST({
    version: "10",
  }).setToken(
    DISCORD_TOKEN
  );

async function registerCommands() {
  console.log(
    "Registering slash commands..."
  );

  await rest.put(
    Routes.applicationGuildCommands(
      DISCORD_CLIENT_ID,
      DISCORD_GUILD_ID
    ),
    {
      body:
        commands,
    }
  );

  console.log(
    "Slash commands registered."
  );
}

// --------------------------------------------------
// Discord client
// --------------------------------------------------

const client =
  new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
  });

client.once(
  "clientReady",
  () => {
    console.log(
      `Logged in as ${
        client.user?.tag ??
        "Unknown Bot"
      }`
    );

    console.log(
      `Dashboard settings sync: ${dashboardSettingsService.getStatus()}`
    );

    console.log(
      `Riot service status: ${riotService.getStatus()}`
    );
  }
);

// --------------------------------------------------
// Interactions
// --------------------------------------------------

client.on(
  "interactionCreate",
  async (interaction) => {
    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    try {
      const settings =
        interaction.guildId
          ? await getSyncedGuildSettings(
              interaction.guildId
            )
          : getDefaultGuildSettings();

      // ----------------------------------------------
      // /ping
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "ping"
      ) {
        await interaction.reply(
          withIcon(
            getIcon(
              settings,
              "ping"
            ),
            "Pong! Valorant Tracker Bot is online."
          )
        );

        return;
      }

      // ----------------------------------------------
      // /link
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "link"
      ) {
        const riotId =
          interaction.options.getString(
            "riot_id",
            true
          );

        const hashIndex =
          riotId.lastIndexOf(
            "#"
          );

        if (
          hashIndex <= 0 ||
          hashIndex ===
            riotId.length -
              1
        ) {
          await interaction.reply({
            content:
              "Please use the full Riot ID format, for example `Tapgod#NA1`.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        const riotName =
          riotId
            .slice(
              0,
              hashIndex
            )
            .trim();

        const riotTag =
          riotId
            .slice(
              hashIndex +
                1
            )
            .trim();

        if (
          !riotName ||
          !riotTag
        ) {
          await interaction.reply({
            content:
              "That Riot ID does not look valid. Use a format like `Tapgod#NA1`.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        saveLinkedAccountStatement.run(
          interaction.user.id,
          riotName,
          riotTag
        );

        await interaction.reply({
          content:
            `${withIcon(
              getIcon(
                settings,
                "profile"
              ),
              `Linked your Discord account to **${riotName}#${riotTag}**.`
            )}\n\n` +
            getVerificationText(
              settings,
              false
            ),
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      // ----------------------------------------------
      // /unlink
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "unlink"
      ) {
        const linkedAccount =
          getLinkedAccount(
            interaction.user.id
          );

        if (
          !linkedAccount
        ) {
          await interaction.reply({
            content:
              "You do not currently have a Riot account linked.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        deleteLinkedAccountStatement.run(
          interaction.user.id
        );

        await interaction.reply({
          content:
            withIcon(
              getIcon(
                settings,
                "profile"
              ),
              `Unlinked **${linkedAccount.riot_name}#${linkedAccount.riot_tag}** from your Discord account.`
            ),
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      // ----------------------------------------------
      // /profile
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "profile"
      ) {
        const selectedPlayer =
          interaction.options.getString(
            "player"
          );

        const selectedUser =
          interaction.options.getUser(
            "user"
          );

        if (
          selectedPlayer
        ) {
          const player =
            players[
              selectedPlayer
            ];

          if (
            !player
          ) {
            await interaction.reply(
              "That mock player could not be found."
            );

            return;
          }

          const totalGames =
            player.wins +
            player.losses;

          const winRate =
            totalGames > 0
              ? (
                  (player.wins /
                    totalGames) *
                  100
                ).toFixed(
                  1
                )
              : "0.0";

          const profileEmbed =
            new EmbedBuilder()
              .setColor(
                settings.embed_color
              )
              .setTitle(
                withIcon(
                  getIcon(
                    settings,
                    "profile"
                  ),
                  `${player.riotName}#${player.tag}`
                )
              )
              .setDescription(
                getProfileDescription(
                  settings,
                  selectedPlayer
                )
              )
              .addFields(
                {
                  name:
                    "Current Rank",
                  value:
                    player.currentRank,
                  inline:
                    true,
                },
                {
                  name:
                    "Peak Rank",
                  value:
                    player.peakRank,
                  inline:
                    true,
                },
                {
                  name:
                    "Win Rate",
                  value:
                    `${winRate}%`,
                  inline:
                    true,
                },
                {
                  name:
                    "K/D",
                  value:
                    player.kd.toFixed(
                      2
                    ),
                  inline:
                    true,
                },
                {
                  name:
                    "ACS",
                  value:
                    player.acs.toString(),
                  inline:
                    true,
                },
                {
                  name:
                    "Headshot %",
                  value:
                    `${player.headshotPercentage}%`,
                  inline:
                    true,
                },
                {
                  name:
                    "Record",
                  value:
                    `${player.wins}W - ${player.losses}L`,
                  inline:
                    true,
                },
                {
                  name:
                    "Main Agents",
                  value:
                    player.mainAgents.join(
                      getAgentSeparator(
                        settings
                      )
                    ),
                  inline:
                    true,
                }
              )
              .setFooter({
                text:
                  `${settings.footer_text} • Mock Data`,
              });

          await interaction.reply({
            embeds: [
              profileEmbed,
            ],
          });

          return;
        }

        const targetUser =
          selectedUser ??
          interaction.user;

        const linkedAccount =
          getLinkedAccount(
            targetUser.id
          );

        if (
          !linkedAccount
        ) {
          if (
            targetUser.id ===
            interaction.user.id
          ) {
            await interaction.reply({
              content:
                "You haven't linked a Riot account yet. Use `/link` first.",
              flags:
                MessageFlags.Ephemeral,
            });
          } else {
            await interaction.reply(
              `${targetUser.username} hasn't linked a Riot account yet.`
            );
          }

          return;
        }

        if (
          linkedAccount.link_method ===
            "rso" &&
          linkedAccount.riot_puuid
        ) {
          const riotStats =
            await riotService.getPlayerStats(
              linkedAccount.riot_puuid
            );

          if (
            riotStats
          ) {
            const totalGames =
              riotStats.wins +
              riotStats.losses;

            const winRate =
              totalGames >
              0
                ? (
                    (riotStats.wins /
                      totalGames) *
                    100
                  ).toFixed(
                    1
                  )
                : "0.0";

            const statsEmbed =
              new EmbedBuilder()
                .setColor(
                  settings.embed_color
                )
                .setTitle(
                  withIcon(
                    getIcon(
                      settings,
                      "profile"
                    ),
                    `${riotStats.riotName}#${riotStats.riotTag}`
                  )
                )
                .setDescription(
                  getProfileDescription(
                    settings,
                    targetUser.username
                  )
                )
                .addFields(
                  {
                    name:
                      "Current Rank",
                    value:
                      riotStats.currentRank ??
                      "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "Peak Rank",
                    value:
                      riotStats.peakRank ??
                      "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "Win Rate",
                    value:
                      `${winRate}%`,
                    inline:
                      true,
                  },
                  {
                    name:
                      "K/D",
                    value:
                      riotStats.kd?.toFixed(
                        2
                      ) ??
                      "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "ACS",
                    value:
                      riotStats.acs?.toString() ??
                      "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "Headshot %",
                    value:
                      riotStats.headshotPercentage !==
                      null
                        ? `${riotStats.headshotPercentage}%`
                        : "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "Record",
                    value:
                      `${riotStats.wins}W - ${riotStats.losses}L`,
                    inline:
                      true,
                  },
                  {
                    name:
                      "Main Agents",
                    value:
                      riotStats.mainAgents.length >
                      0
                        ? riotStats.mainAgents.join(
                            getAgentSeparator(
                              settings
                            )
                          )
                        : "Unavailable",
                    inline:
                      true,
                  },
                  {
                    name:
                      "Verification",
                    value:
                      getVerificationText(
                        settings,
                        true
                      ),
                    inline:
                      false,
                  }
                )
                .setFooter({
                  text:
                    settings.footer_text,
                });

            await interaction.reply({
              embeds: [
                statsEmbed,
              ],
            });

            return;
          }

          await interaction.reply({
            content:
              `${getVerificationText(
                settings,
                true
              )}\n\nVALORANT stats are currently unavailable. Please try again later.`,
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        const linkedEmbed =
          new EmbedBuilder()
            .setColor(
              settings.embed_color
            )
            .setTitle(
              withIcon(
                getIcon(
                  settings,
                  "profile"
                ),
                `${linkedAccount.riot_name}#${linkedAccount.riot_tag}`
              )
            )
            .setDescription(
              getProfileDescription(
                settings,
                targetUser.username
              )
            )
            .addFields(
              {
                name:
                  "Riot ID",
                value:
                  `**${linkedAccount.riot_name}#${linkedAccount.riot_tag}**`,
                inline:
                  true,
              },
              {
                name:
                  "Verification",
                value:
                  getVerificationText(
                    settings,
                    linkedAccount.link_method ===
                      "rso"
                  ),
                inline:
                  true,
              }
            )
            .setFooter({
              text:
                settings.footer_text,
            });

        await interaction.reply({
          embeds: [
            linkedEmbed,
          ],
        });

        return;
      }

      // ----------------------------------------------
      // /settings
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "settings"
      ) {
        if (
          !interaction.guildId
        ) {
          await interaction.reply({
            content:
              "Server settings can only be used inside a Discord server.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        const subcommand =
          interaction.options.getSubcommand();

        if (
          subcommand ===
          "view"
        ) {
          const currentSettings =
            await getSyncedGuildSettings(
              interaction.guildId
            );

          await interaction.reply({
            embeds: [
              buildSettingsEmbed(
                currentSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        const canManageServer =
          interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
          ) ??
          false;

        if (
          !canManageServer
        ) {
          await interaction.reply({
            content:
              "You need the **Manage Server** permission to change bot settings.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        if (
          subcommand ===
          "style"
        ) {
          const style =
            interaction.options.getString(
              "style",
              true
            );

          updateGuildStyleStatement.run(
            style,
            interaction.guildId
          );

          const updatedSettings =
            getGuildSettings(
              interaction.guildId
            );

          await pushGuildSettings(
            updatedSettings
          );

          await interaction.reply({
            content:
              `Server style changed to **${style}**.`,
            embeds: [
              buildSettingsEmbed(
                updatedSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        if (
          subcommand ===
          "color"
        ) {
          const rawColor =
            interaction.options
              .getString(
                "hex",
                true
              )
              .trim();

          const normalizedColor =
            rawColor.startsWith(
              "#"
            )
              ? rawColor.slice(
                  1
                )
              : rawColor;

          if (
            !/^[0-9A-Fa-f]{6}$/.test(
              normalizedColor
            )
          ) {
            await interaction.reply({
              content:
                "Please use a 6-digit hex color such as `#FFB6C1`.",
              flags:
                MessageFlags.Ephemeral,
            });

            return;
          }

          const colorValue =
            Number.parseInt(
              normalizedColor,
              16
            );

          updateGuildColorStatement.run(
            colorValue,
            interaction.guildId
          );

          const updatedSettings =
            getGuildSettings(
              interaction.guildId
            );

          await pushGuildSettings(
            updatedSettings
          );

          await interaction.reply({
            content:
              `Embed color changed to **#${normalizedColor.toUpperCase()}**.`,
            embeds: [
              buildSettingsEmbed(
                updatedSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        if (
          subcommand ===
          "footer"
        ) {
          const footerText =
            interaction.options
              .getString(
                "text",
                true
              )
              .trim();

          if (
            !footerText
          ) {
            await interaction.reply({
              content:
                "Footer text cannot be empty.",
              flags:
                MessageFlags.Ephemeral,
            });

            return;
          }

          updateGuildFooterStatement.run(
            footerText,
            interaction.guildId
          );

          const updatedSettings =
            getGuildSettings(
              interaction.guildId
            );

          await pushGuildSettings(
            updatedSettings
          );

          await interaction.reply({
            content:
              "Footer updated.",
            embeds: [
              buildSettingsEmbed(
                updatedSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        if (
          subcommand ===
          "emoji"
        ) {
          const emojiStyle =
            interaction.options.getString(
              "style",
              true
            );

          updateGuildEmojiStatement.run(
            emojiStyle,
            interaction.guildId
          );

          const updatedSettings =
            getGuildSettings(
              interaction.guildId
            );

          await pushGuildSettings(
            updatedSettings
          );

          await interaction.reply({
            content:
              `Emoji style changed to **${emojiStyle}**.`,
            embeds: [
              buildSettingsEmbed(
                updatedSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        if (
          subcommand ===
          "reset"
        ) {
          resetGuildSettingsStatement.run(
            interaction.guildId
          );

          const updatedSettings =
            getGuildSettings(
              interaction.guildId
            );

          await pushGuildSettings(
            updatedSettings
          );

          await interaction.reply({
            content:
              "Server bot settings have been reset to the default cute theme.",
            embeds: [
              buildSettingsEmbed(
                updatedSettings
              ),
            ],
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }
      }

      // ----------------------------------------------
      // /compare
      // ----------------------------------------------

      if (
        interaction.commandName ===
        "compare"
      ) {
        const user1 =
          interaction.options.getUser(
            "user1",
            true
          );

        const user2 =
          interaction.options.getUser(
            "user2",
            true
          );

        if (
          user1.id ===
          user2.id
        ) {
          await interaction.reply({
            content:
              "Choose two different Discord users to compare.",
            flags:
              MessageFlags.Ephemeral,
          });

          return;
        }

        const account1 =
          getLinkedAccount(
            user1.id
          );

        const account2 =
          getLinkedAccount(
            user2.id
          );

        if (
          !account1 &&
          !account2
        ) {
          await interaction.reply(
            `Neither ${user1.username} nor ${user2.username} has linked a Riot account yet.`
          );

          return;
        }

        if (
          !account1
        ) {
          await interaction.reply(
            `${user1.username} hasn't linked a Riot account yet.`
          );

          return;
        }

        if (
          !account2
        ) {
          await interaction.reply(
            `${user2.username} hasn't linked a Riot account yet.`
          );

          return;
        }

        const account1Verification =
          getVerificationText(
            settings,
            account1.link_method ===
              "rso"
          );

        const account2Verification =
          getVerificationText(
            settings,
            account2.link_method ===
              "rso"
          );

        const comparisonEmbed =
          new EmbedBuilder()
            .setColor(
              settings.embed_color
            )
            .setTitle(
              getCompareTitle(
                settings
              )
            )
            .setDescription(
              getStyle(
                settings
              ) ===
                "cute"
                ? `**${user1.username}** ♡ **${user2.username}**`
                : `**${user1.username}** vs **${user2.username}**`
            )
            .addFields(
              {
                name:
                  user1.username,
                value:
                  `**${account1.riot_name}#${account1.riot_tag}**\n${account1Verification}`,
                inline:
                  true,
              },
              {
                name:
                  getStyle(
                    settings
                  ) ===
                  "cute"
                    ? "♡"
                    : "VS",
                value:
                  getStyle(
                    settings
                  ) ===
                  "cute"
                    ? "୨୧"
                    : "vs",
                inline:
                  true,
              },
              {
                name:
                  user2.username,
                value:
                  `**${account2.riot_name}#${account2.riot_tag}**\n${account2Verification}`,
                inline:
                  true,
              }
            )
            .setFooter({
              text:
                settings.footer_text,
            });

        await interaction.reply({
          embeds: [
            comparisonEmbed,
          ],
        });

        return;
      }
    } catch (error) {
      console.error(
        "Interaction error:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction.followUp({
          content:
            "Something went wrong while running that command.",
          flags:
            MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content:
            "Something went wrong while running that command.",
          flags:
            MessageFlags.Ephemeral,
        });
      }
    }
  }
);

// --------------------------------------------------
// Start bot
// --------------------------------------------------

async function start() {
  await registerCommands();

  await client.login(
    DISCORD_TOKEN
  );
}

start().catch(
  (error) => {
    console.error(
      "Failed to start bot:",
      error
    );
  }
);
