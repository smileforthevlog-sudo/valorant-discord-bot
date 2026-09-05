import {
  buildLinkedProfileEmbedV2,
  buildProfileEmbedV2,
} from "../src/appearance/renderer";

import {
  createDefaultAppearanceV2,
} from "../src/appearance/defaults";

function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(
      `Linked profile self-test failed: ${message}`
    );
  }
}

function getFieldNames(
  embedJson: ReturnType<
    ReturnType<
      typeof buildProfileEmbedV2
    >["toJSON"]
  >
): string[] {
  return (
    embedJson.fields?.map(
      (field) =>
        field.name
    ) ?? []
  );
}

const appearance =
  createDefaultAppearanceV2();

appearance.text.footer =
  "Cosmetics V2 Test";

const linked =
  buildLinkedProfileEmbedV2(
    {
      riotName:
        "ExamplePlayer",

      riotTag:
        "NA1",

      discordUsername:
        "DiscordUser",

      verificationText:
        "Manual link • not Riot verified",
    },

    appearance
  ).toJSON();

assert(
  linked.title?.includes(
    "ExamplePlayer#NA1"
  ),
  "linked Riot ID should appear in the title"
);

assert(
  linked.fields?.length ===
    2,
  "identity-only linked profile should have exactly two fields"
);

assert(
  linked.fields?.[0]?.name ===
    "Riot ID",
  "first linked field should be Riot ID"
);

assert(
  linked.fields?.[1]?.name ===
    "Verification",
  "second linked field should be Verification"
);

assert(
  linked.footer?.text ===
    "Cosmetics V2 Test",
  "linked profile should use the V2 footer"
);

const verified =
  buildProfileEmbedV2(
    {
      riotName:
        "VerifiedPlayer",

      riotTag:
        "NA1",

      discordUsername:
        "DiscordUser",

      currentRank:
        "Diamond 2",

      peakRank:
        "Ascendant 1",

      wins:
        37,

      losses:
        29,

      kd:
        1.14,

      acs:
        238,

      headshotPercentage:
        27.4,

      mainAgents: [
        "Jett",
        "Omen",
      ],

      verified:
        true,

      verificationText:
        "Riot verified",
    },

    appearance,

    {
      thumbnailUrl:
        "https://example.com/diamond2.png",
    }
  ).toJSON();

const verifiedFields =
  getFieldNames(
    verified
  );

assert(
  verifiedFields.includes(
    "Current Rank"
  ),
  "verified profile should include Current Rank"
);

assert(
  verifiedFields.includes(
    "Verification"
  ),
  "verified profile should include Verification"
);

assert(
  verified.thumbnail?.url ===
    "https://example.com/diamond2.png",
  "verified profile should accept resolved rank artwork"
);

console.log(
  "Cosmetics V2 Phase 6C linked profile self-test passed."
);
