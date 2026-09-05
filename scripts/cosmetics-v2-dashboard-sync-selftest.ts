import {
  parseDashboardGuildSettings,
} from "../src/services/dashboardSettings";

function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(
      `Dashboard V2 sync self-test failed: ${message}`
    );
  }
}

const parsed =
  parseDashboardGuildSettings(
    {
      style: "cute",
      embedColor: 0x7c83fd,
      footerText:
        "Dashboard V2 Test",
      emojiStyle:
        "normal",
      source:
        "saved",

      appearance: {
        version: 2,
        preset:
          "midnight",

        colors: {
          accent:
            "#7C83FD",
        },

        typography: {
          titleStyle:
            "sparkles",
          dividerStyle:
            "dash",
        },

        layout: {
          profile:
            "compact",
          compare:
            "minimal",
        },

        effects: {
          emojiStyle:
            "normal",
          timestamp:
            true,
        },

        stats: {
          currentRank:
            true,
          peakRank:
            true,
          record:
            true,
          winRate:
            true,
          kd:
            true,
          acs:
            false,
          headshotPercentage:
            true,
          mainAgents:
            false,
        },

        images: {
          thumbnail: {
            mode:
              "agent",
          },
          largeImage: {
            mode:
              "none",
          },
          footerIcon: {
            mode:
              "server",
          },
          header: {
            mode:
              "none",
          },
        },

        customAssets: {
          thumbnailUrl:
            null,
          largeImageUrl:
            null,
          footerIconUrl:
            null,
          headerUrl:
            null,
          leaderboardBannerUrl:
            null,
        },

        text: {
          footer:
            "Dashboard V2 Test",
        },
      },
    }
  );

assert(
  parsed !== null,
  "valid dashboard settings should parse"
);

assert(
  parsed.appearance?.preset ===
    "midnight",
  "V2 preset should survive dashboard parsing"
);

assert(
  parsed.appearance?.typography.titleStyle ===
    "sparkles",
  "V2 title style should survive dashboard parsing"
);

assert(
  parsed.appearance?.effects.timestamp ===
    true,
  "V2 timestamp should survive dashboard parsing"
);

assert(
  parsed.appearance?.stats.acs ===
    false,
  "V2 stat visibility should survive dashboard parsing"
);

assert(
  parsed.appearance?.stats.mainAgents ===
    false,
  "multiple V2-only settings should survive dashboard parsing"
);

assert(
  parsed.appearance?.images.thumbnail.mode ===
    "agent",
  "V2 image modes should survive dashboard parsing"
);

const oldRecord =
  parseDashboardGuildSettings(
    {
      style:
        "classic",
      embedColor:
        0xff4655,
      footerText:
        "Old Dashboard Record",
      emojiStyle:
        "normal",
      source:
        "saved",
    }
  );

assert(
  oldRecord !== null,
  "legacy-only dashboard settings should remain valid"
);

assert(
  oldRecord.appearance ===
    undefined,
  "legacy-only records should use the existing compatibility path"
);

const malformed =
  parseDashboardGuildSettings(
    {
      style:
        "cute",
      embedColor:
        0xffb6c1,
      footerText:
        "Malformed appearance fallback",
      emojiStyle:
        "cute",

      appearance: {
        version:
          999,
      },
    }
  );

assert(
  malformed !== null,
  "a malformed optional appearance must not break legacy settings"
);

assert(
  malformed.appearance ===
    undefined,
  "invalid optional V2 appearance should be ignored safely"
);

console.log(
  "Cosmetics V2 Dashboard Phase 7C sync self-test passed."
);
