import type {
  DatabaseSync,
} from "node:sqlite";

import {
  appearanceV2FromLegacy,
} from "./defaults";

import {
  parseAppearanceV2,
  stringifyAppearanceV2,
} from "./parser";

import type {
  AppearanceV2,
  LegacyAppearanceSettings,
} from "./types";

// --------------------------------------------------
// Cosmetics V2 SQLite store
// --------------------------------------------------
//
// This is the compatibility bridge between the current
// V1 guild settings and the new V2 appearance JSON.
//
// Important Phase 3 behavior:
// - Existing V1 fields still control the live bot.
// - appearance_json is created lazily from V1.
// - Malformed V2 JSON self-heals from V1.
// - V1 changes update only V1-compatible V2 fields.
// - V2-only settings such as custom assets/stat toggles
//   survive V1 compatibility updates.
// --------------------------------------------------

type AppearanceJsonRow = {
  appearance_json: string | null;
};

export type AppearanceV2Store = {
  get(
    guildId: string
  ): AppearanceV2 | null;

  getOrCreate(
    guildId: string,
    legacy: LegacyAppearanceSettings
  ): AppearanceV2;

  save(
    guildId: string,
    appearance: AppearanceV2
  ): AppearanceV2;

  syncLegacyFields(
    guildId: string,
    legacy: LegacyAppearanceSettings
  ): AppearanceV2;

  clear(
    guildId: string
  ): void;
};

export function createAppearanceV2Store(
  db: DatabaseSync
): AppearanceV2Store {
  const ensureGuildRowStatement =
    db.prepare(`
      INSERT OR IGNORE INTO guild_settings (
        guild_id
      )
      VALUES (?)
    `);

  const getStatement =
    db.prepare(`
      SELECT appearance_json
      FROM guild_settings
      WHERE guild_id = ?
    `);

  const saveStatement =
    db.prepare(`
      UPDATE guild_settings
      SET
        appearance_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE guild_id = ?
    `);

  const clearStatement =
    db.prepare(`
      UPDATE guild_settings
      SET
        appearance_json = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE guild_id = ?
    `);

  function ensureGuildRow(
    guildId: string
  ): void {
    ensureGuildRowStatement.run(
      guildId
    );
  }

  function get(
    guildId: string
  ): AppearanceV2 | null {
    ensureGuildRow(
      guildId
    );

    const row =
      getStatement.get(
        guildId
      ) as
        | AppearanceJsonRow
        | undefined;

    return parseAppearanceV2(
      row?.appearance_json
    );
  }

  function save(
    guildId: string,
    appearance: AppearanceV2
  ): AppearanceV2 {
    ensureGuildRow(
      guildId
    );

    const serialized =
      stringifyAppearanceV2(
        appearance
      );

    saveStatement.run(
      serialized,
      guildId
    );

    const saved =
      parseAppearanceV2(
        serialized
      );

    if (!saved) {
      throw new Error(
        "Failed to serialize Cosmetics V2 appearance."
      );
    }

    return saved;
  }

  function getOrCreate(
    guildId: string,
    legacy: LegacyAppearanceSettings
  ): AppearanceV2 {
    const existing =
      get(guildId);

    if (existing) {
      return existing;
    }

    const migrated =
      appearanceV2FromLegacy(
        legacy
      );

    return save(
      guildId,
      migrated
    );
  }

  function syncLegacyFields(
    guildId: string,
    legacy: LegacyAppearanceSettings
  ): AppearanceV2 {
    const migrated =
      appearanceV2FromLegacy(
        legacy
      );

    const existing =
      get(guildId);

    if (!existing) {
      return save(
        guildId,
        migrated
      );
    }

    // Mirror fields that exist in V1 while deliberately
    // preserving V2-only customization.
    const next =
      structuredClone(
        existing
      );

    next.version = 2;
    next.preset =
      migrated.preset;

    next.colors.accent =
      migrated.colors.accent;

    next.typography.titleStyle =
      migrated.typography.titleStyle;

    next.typography.dividerStyle =
      migrated.typography.dividerStyle;

    next.layout.profile =
      migrated.layout.profile;

    next.layout.compare =
      migrated.layout.compare;

    next.effects.emojiStyle =
      migrated.effects.emojiStyle;

    next.text.footer =
      migrated.text.footer;

    return save(
      guildId,
      next
    );
  }

  function clear(
    guildId: string
  ): void {
    ensureGuildRow(
      guildId
    );

    clearStatement.run(
      guildId
    );
  }

  return {
    get,
    getOrCreate,
    save,
    syncLegacyFields,
    clear,
  };
}
