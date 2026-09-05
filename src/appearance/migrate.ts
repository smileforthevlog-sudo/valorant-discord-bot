import type {
  DatabaseSync,
} from "node:sqlite";

// --------------------------------------------------
// Cosmetics V2 SQLite migration
// --------------------------------------------------
//
// Phase 1 adds a nullable JSON column only.
// Existing V1 settings remain the source of truth,
// so this migration cannot change the current bot
// appearance or dashboard behavior.
// --------------------------------------------------

export function ensureAppearanceV2Column(
  db: DatabaseSync
): void {
  const columns =
    db
      .prepare(
        "PRAGMA table_info(guild_settings)"
      )
      .all() as Array<{
        name: string;
      }>;

  const hasAppearanceJson =
    columns.some(
      (column) =>
        column.name ===
        "appearance_json"
    );

  if (hasAppearanceJson) {
    return;
  }

  db.exec(`
    ALTER TABLE guild_settings
    ADD COLUMN appearance_json TEXT
  `);

  console.log(
    "Database updated: added appearance_json column for Cosmetics V2."
  );
}
