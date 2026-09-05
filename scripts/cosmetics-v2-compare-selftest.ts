import {
  buildComparisonEmbedV2,
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
      `Compare self-test failed: ${message}`
    );
  }
}

const appearance =
  createDefaultAppearanceV2();

appearance.text.footer =
  "Cosmetics V2 Compare Test";

const embed =
  buildComparisonEmbedV2(
    {
      left: {
        label:
          "PlayerOne",

        riotName:
          "Alpha",

        riotTag:
          "NA1",

        verified:
          false,

        verificationText:
          "⚠️ Manual link — not Riot verified",
      },

      right: {
        label:
          "PlayerTwo",

        riotName:
          "Bravo",

        riotTag:
          "NA2",

        verified:
          true,

        verificationText:
          "✅ Riot verified",
      },
    },

    appearance
  ).toJSON();

assert(
  embed.title?.includes(
    "VALORANT Player Comparison"
  ),
  "comparison title should use the V2 renderer"
);

assert(
  embed.description?.includes(
    "PlayerOne"
  ) &&
  embed.description?.includes(
    "PlayerTwo"
  ),
  "comparison description should include both Discord labels"
);

assert(
  embed.fields?.length ===
    3,
  "comparison should have left, divider, and right fields"
);

const leftValue =
  embed.fields?.[0]?.value ??
  "";

const rightValue =
  embed.fields?.[2]?.value ??
  "";

assert(
  leftValue.includes(
    "Alpha#NA1"
  ),
  "left Riot ID should be present"
);

assert(
  leftValue.includes(
    "Manual link"
  ),
  "manual verification wording should be preserved"
);

assert(
  rightValue.includes(
    "Bravo#NA2"
  ),
  "right Riot ID should be present"
);

assert(
  rightValue.includes(
    "Riot verified"
  ),
  "verified wording should be preserved"
);

assert(
  !leftValue.includes(
    "Rank:"
  ) &&
  !leftValue.includes(
    "K/D:"
  ) &&
  !leftValue.includes(
    "ACS:"
  ),
  "identity-only comparison should not invent unavailable stats"
);

assert(
  embed.footer?.text ===
    "Cosmetics V2 Compare Test",
  "comparison should use the V2 footer"
);

console.log(
  "Cosmetics V2 Phase 6D compare self-test passed."
);
