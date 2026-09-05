import "dotenv/config";

import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

import { DatabaseSync } from "node:sqlite";

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  throw new Error("DISCORD_TOKEN is missing from .env");
}

if (!clientId) {
  throw new Error("DISCORD_CLIENT_ID is missing from .env");
}

if (!guildId) {
  throw new Error("DISCORD_GUILD_ID is missing from .env");
}

const DISCORD_TOKEN: string = token;
const DISCORD_CLIENT_ID: string = clientId;
const DISCORD_GUILD_ID: string = guildId;

// --------------------------------------------------
// SQLite database
// --------------------------------------------------

const db = new DatabaseSync("data/valorant-bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS linked_accounts (
    discord_user_id TEXT PRIMARY KEY,
    riot_name TEXT NOT NULL,
    riot_tag TEXT NOT NULL,
    linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// --------------------------------------------------
// Database migrations
// --------------------------------------------------

const linkedAccountColumns = db
  .prepare("PRAGMA table_info(linked_accounts)")
  .all() as Array<{ name: string }>;

if (
  !linkedAccountColumns.some(
    (column) => column.name === "riot_puuid"
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
    (column) => column.name === "link_method"
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
    (column) => column.name === "verified_at"
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
// Types
// --------------------------------------------------

type LinkedAccount = {
  riot_name: string;
  riot_tag: string;
  riot_puuid: string | null;
  link_method: string;
  verified_at: string | null;
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

const players: Record<string, MockPlayer> = {
  jason: {
    riotName: "Tapgod",
    tag: "NA1",
    currentRank: "Diamond 2",
    peakRank: "Ascendant 1",
    wins: 37,
    losses: 29,
    kd: 1.14,
    acs: 238,
    headshotPercentage: 27.4,
    mainAgents: ["Jett", "Omen", "Reyna"],
  },

  alex: {
    riotName: "Alex",
    tag: "NA1",
    currentRank: "Platinum 3",
    peakRank: "Diamond 1",
    wins: 31,
    losses: 29,
    kd: 1.02,
    acs: 219,
    headshotPercentage: 21.9,
    mainAgents: ["Sova", "Cypher", "Omen"],
  },
};

// --------------------------------------------------
// Database helpers
// --------------------------------------------------

// Manual /link
const saveLinkedAccountStatement = db.prepare(`
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

// Future Riot Sign On save helper
const saveVerifiedLinkedAccountStatement = db.prepare(`
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

const deleteLinkedAccountStatement = db.prepare(`
  DELETE FROM linked_accounts
  WHERE discord_user_id = ?
`);

const getLinkedAccountStatement = db.prepare(`
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
  ) as LinkedAccount | undefined;
}

// --------------------------------------------------
// Slash commands
// --------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online"),

  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Discord account to a Riot ID")
    .addStringOption((option) =>
      option
        .setName("riot_id")
        .setDescription(
          "Your Riot ID, for example Tapgod#NA1"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unlink")
    .setDescription(
      "Unlink your Riot account from Discord"
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a Valorant player profile")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Choose a mock player")
        .setRequired(false)
        .addChoices(
          {
            name: "Jason",
            value: "jason",
          },
          {
            name: "Alex",
            value: "alex",
          }
        )
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "View a linked Discord user's Valorant profile"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("compare")
    .setDescription("Compare two linked Valorant players")
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("First Discord user")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user2")
        .setDescription("Second Discord user")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

// --------------------------------------------------
// Discord REST
// --------------------------------------------------

const rest = new REST({
  version: "10",
}).setToken(DISCORD_TOKEN);

async function registerCommands() {
  console.log("Registering slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(
      DISCORD_CLIENT_ID,
      DISCORD_GUILD_ID
    ),
    {
      body: commands,
    }
  );

  console.log("Slash commands registered.");
}

// --------------------------------------------------
// Discord client
// --------------------------------------------------

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("clientReady", () => {
  console.log(
    `Logged in as ${client.user?.tag ?? "Unknown Bot"}`
  );
});

// --------------------------------------------------
// Interactions
// --------------------------------------------------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    // ------------------------------------------------
    // /ping
    // ------------------------------------------------

    if (interaction.commandName === "ping") {
      await interaction.reply(
        "🏓 Pong! Valorant Tracker Bot is online."
      );

      return;
    }

    // ------------------------------------------------
    // /link
    // ------------------------------------------------

    if (interaction.commandName === "link") {
      const riotId =
        interaction.options.getString("riot_id", true);

      const hashIndex = riotId.lastIndexOf("#");

      if (
        hashIndex <= 0 ||
        hashIndex === riotId.length - 1
      ) {
        await interaction.reply({
          content:
            "Please use the full Riot ID format, for example `Tapgod#NA1`.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      const riotName = riotId
        .slice(0, hashIndex)
        .trim();

      const riotTag = riotId
        .slice(hashIndex + 1)
        .trim();

      if (!riotName || !riotTag) {
        await interaction.reply({
          content:
            "That Riot ID does not look valid. Use a format like `Tapgod#NA1`.",
          flags: MessageFlags.Ephemeral,
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
          `Linked your Discord account to **${riotName}#${riotTag}**.\n\n` +
          "⚠️ This is currently a manual link and has not been verified through Riot Sign On.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // ------------------------------------------------
    // /unlink
    // ------------------------------------------------

    if (interaction.commandName === "unlink") {
      const linkedAccount =
        getLinkedAccount(interaction.user.id);

      if (!linkedAccount) {
        await interaction.reply({
          content:
            "You do not currently have a Riot account linked.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      deleteLinkedAccountStatement.run(
        interaction.user.id
      );

      await interaction.reply({
        content:
          `Unlinked **${linkedAccount.riot_name}#${linkedAccount.riot_tag}** from your Discord account.`,
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // ------------------------------------------------
    // /profile
    // ------------------------------------------------

    if (interaction.commandName === "profile") {
      const selectedPlayer =
        interaction.options.getString("player");

      const selectedUser =
        interaction.options.getUser("user");

      // Mock player profile
      if (selectedPlayer) {
        const player = players[selectedPlayer];

        if (!player) {
          await interaction.reply(
            "That mock player could not be found."
          );

          return;
        }

        const totalGames =
          player.wins + player.losses;

        const winRate =
          totalGames > 0
            ? (
                (player.wins / totalGames) *
                100
              ).toFixed(1)
            : "0.0";

        const profileEmbed = new EmbedBuilder()
          .setColor(0xff4655)
          .setTitle(
            `${player.riotName}#${player.tag}`
          )
          .setDescription(
            "Valorant Player Profile"
          )
          .addFields(
            {
              name: "Current Rank",
              value: player.currentRank,
              inline: true,
            },
            {
              name: "Peak Rank",
              value: player.peakRank,
              inline: true,
            },
            {
              name: "Win Rate",
              value: `${winRate}%`,
              inline: true,
            },
            {
              name: "K/D",
              value: player.kd.toFixed(2),
              inline: true,
            },
            {
              name: "ACS",
              value: player.acs.toString(),
              inline: true,
            },
            {
              name: "Headshot %",
              value: `${player.headshotPercentage}%`,
              inline: true,
            },
            {
              name: "Record",
              value:
                `${player.wins}W - ${player.losses}L`,
              inline: true,
            },
            {
              name: "Main Agents",
              value:
                player.mainAgents.join(" • "),
              inline: true,
            }
          )
          .setFooter({
            text:
              "Valorant Tracker Bot • Mock Data",
          });

        await interaction.reply({
          embeds: [profileEmbed],
        });

        return;
      }

      // Linked Discord account
      const targetUser =
        selectedUser ?? interaction.user;

      const linkedAccount =
        getLinkedAccount(targetUser.id);

      if (!linkedAccount) {
        if (
          targetUser.id === interaction.user.id
        ) {
          await interaction.reply({
            content:
              "You haven't linked a Riot account yet. Use `/link` first.",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply(
            `${targetUser.username} hasn't linked a Riot account yet.`
          );
        }

        return;
      }

      const verificationText =
        linkedAccount.link_method === "rso"
          ? "✅ Verified via Riot Sign On"
          : "⚠️ Manual link — not Riot verified";

      const linkedEmbed = new EmbedBuilder()
        .setColor(0xff4655)
        .setTitle(
          `${linkedAccount.riot_name}#${linkedAccount.riot_tag}`
        )
        .setDescription(
          `Linked Valorant account for **${targetUser.username}**`
        )
        .addFields(
          {
            name: "Riot ID",
            value:
              `**${linkedAccount.riot_name}#${linkedAccount.riot_tag}**`,
            inline: true,
          },
          {
            name: "Verification",
            value: verificationText,
            inline: true,
          }
        )
        .setFooter({
          text:
            "Valorant Tracker Bot • Real stats coming next",
        });

      await interaction.reply({
        embeds: [linkedEmbed],
      });

      return;
    }

    // ------------------------------------------------
    // /compare
    // ------------------------------------------------

    if (interaction.commandName === "compare") {
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

      if (user1.id === user2.id) {
        await interaction.reply({
          content:
            "Choose two different Discord users to compare.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      const account1 =
        getLinkedAccount(user1.id);

      const account2 =
        getLinkedAccount(user2.id);

      if (!account1 && !account2) {
        await interaction.reply(
          `Neither ${user1.username} nor ${user2.username} has linked a Riot account yet.`
        );

        return;
      }

      if (!account1) {
        await interaction.reply(
          `${user1.username} hasn't linked a Riot account yet.`
        );

        return;
      }

      if (!account2) {
        await interaction.reply(
          `${user2.username} hasn't linked a Riot account yet.`
        );

        return;
      }

      const account1Verification =
        account1.link_method === "rso"
          ? "✅ Riot verified"
          : "⚠️ Manual link";

      const account2Verification =
        account2.link_method === "rso"
          ? "✅ Riot verified"
          : "⚠️ Manual link";

      const comparisonEmbed =
        new EmbedBuilder()
          .setColor(0xff4655)
          .setTitle(
            "⚔️ Valorant Player Comparison"
          )
          .setDescription(
            `**${user1.username}** vs **${user2.username}**`
          )
          .addFields(
            {
              name: user1.username,
              value:
                `**${account1.riot_name}#${account1.riot_tag}**\n${account1Verification}`,
              inline: true,
            },
            {
              name: "VS",
              value: "⚔️",
              inline: true,
            },
            {
              name: user2.username,
              value:
                `**${account2.riot_name}#${account2.riot_tag}**\n${account2Verification}`,
              inline: true,
            }
          )
          .setFooter({
            text:
              "Valorant Tracker Bot • Linked accounts",
          });

      await interaction.reply({
        embeds: [comparisonEmbed],
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
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content:
          "Something went wrong while running that command.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// --------------------------------------------------
// Start bot
// --------------------------------------------------

async function start() {
  await registerCommands();

  await client.login(
    DISCORD_TOKEN
  );
}

start().catch((error) => {
  console.error(
    "Failed to start bot:",
    error
  );
});