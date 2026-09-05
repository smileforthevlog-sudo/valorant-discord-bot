import {
  DatabaseSync,
} from "node:sqlite";

import {
  ensureAppearanceV2Column,
} from "../src/appearance/migrate";

import {
  createAppearanceV2Store,
} from "../src/appearance/store";

function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(
      `Self-test failed: ${message}`
    );
  }
}

const db =
  new DatabaseSync(
    ":memory:"
  );

db.exec(`
  CREATE TABLE guild_settings (
    guild_id TEXT PRIMARY KEY,
    style TEXT NOT NULL DEFAULT 'cute',
    embed_color INTEGER NOT NULL DEFAULT 16758465,
    footer_text TEXT NOT NULL DEFAULT 'Valorant Tracker Bot ♡',
    emoji_style TEXT NOT NULL DEFAULT 'cute',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

ensureAppearanceV2Column(
  db
);

const store =
  createAppearanceV2Store(
    db
  );

const first =
  store.getOrCreate(
    "guild-test",
    {
      style: "classic",
      embedColor: 0x123456,
      footerText:
        "legacy footer",
      emojiStyle: "normal",
    }
  );

assert(
  first.version === 2,
  "migration should create version 2"
);

assert(
  first.preset ===
    "classic",
  "classic V1 style should migrate to classic preset"
);

assert(
  first.colors.accent ===
    "#123456",
  "legacy integer color should migrate to hex"
);

assert(
  first.text.footer ===
    "legacy footer",
  "legacy footer should migrate"
);

// Simulate V2-only customization.
first.stats.acs = false;
first.stats.mainAgents =
  false;

first.customAssets.headerUrl =
  "https://example.com/header.png";

store.save(
  "guild-test",
  first
);

// Now simulate an old /settings-compatible change.
// V2-only values must survive.
const synced =
  store.syncLegacyFields(
    "guild-test",
    {
      style: "cute",
      embedColor: 0xabcdef,
      footerText:
        "updated legacy footer",
      emojiStyle: "cute",
    }
  );

assert(
  synced.preset ===
    "cute",
  "legacy style sync should update preset"
);

assert(
  synced.colors.accent ===
    "#ABCDEF",
  "legacy color sync should update accent"
);

assert(
  synced.text.footer ===
    "updated legacy footer",
  "legacy footer sync should update footer"
);

assert(
  synced.stats.acs ===
    false,
  "V2 stat visibility must survive V1 sync"
);

assert(
  synced.stats.mainAgents ===
    false,
  "V2 agent visibility must survive V1 sync"
);

assert(
  synced.customAssets.headerUrl ===
    "https://example.com/header.png",
  "V2 custom assets must survive V1 sync"
);

// Corrupt the JSON deliberately and confirm that
// lazy migration repairs it from the supplied V1 data.
db.prepare(`
  UPDATE guild_settings
  SET appearance_json = ?
  WHERE guild_id = ?
`).run(
  "{not-valid-json",
  "guild-broken"
);

const repaired =
  store.getOrCreate(
    "guild-broken",
    {
      style: "minimal",
      embedColor: 0x010203,
      footerText: "repaired",
      emojiStyle: "none",
    }
  );

assert(
  repaired.preset ===
    "minimal",
  "invalid JSON should self-heal from V1"
);

assert(
  repaired.colors.accent ===
    "#010203",
  "repaired JSON should preserve V1 color"
);

console.log(
  "Cosmetics V2 Phase 3 self-test passed."
);

db.close();
