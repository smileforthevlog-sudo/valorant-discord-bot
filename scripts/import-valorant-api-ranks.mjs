import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  join,
} from "node:path";

const COMPETITIVE_TIERS_URL =
  "https://valorant-api.com/v1/competitivetiers";

const root =
  process.cwd();

const outputRoot =
  join(
    root,
    "generated-netlify-assets"
  );

const publicRoot =
  join(
    outputRoot,
    "assets",
    "valorant"
  );

const rankOutputDir =
  join(
    publicRoot,
    "ranks"
  );

const manifestPath =
  join(
    publicRoot,
    "appearance-assets.json"
  );

const generatedManifestPath =
  join(
    root,
    "appearance-assets.generated.json"
  );

const reportPath =
  join(
    outputRoot,
    "RANK-IMPORT-REPORT.json"
  );

const args =
  process.argv.slice(2);

function getArg(
  name,
  fallback
) {
  const index =
    args.indexOf(name);

  if (
    index < 0 ||
    index ===
      args.length - 1
  ) {
    return fallback;
  }

  return args[
    index + 1
  ];
}

const baseUrl =
  getArg(
    "--base-url",
    "https://amazing-quokka-76fd8d.netlify.app"
  ).replace(
    /\/+$/,
    ""
  );

const EXPECTED_RANKS = [
  ["IRON 1", "iron1"],
  ["IRON 2", "iron2"],
  ["IRON 3", "iron3"],
  ["BRONZE 1", "bronze1"],
  ["BRONZE 2", "bronze2"],
  ["BRONZE 3", "bronze3"],
  ["SILVER 1", "silver1"],
  ["SILVER 2", "silver2"],
  ["SILVER 3", "silver3"],
  ["GOLD 1", "gold1"],
  ["GOLD 2", "gold2"],
  ["GOLD 3", "gold3"],
  ["PLATINUM 1", "platinum1"],
  ["PLATINUM 2", "platinum2"],
  ["PLATINUM 3", "platinum3"],
  ["DIAMOND 1", "diamond1"],
  ["DIAMOND 2", "diamond2"],
  ["DIAMOND 3", "diamond3"],
  ["ASCENDANT 1", "ascendant1"],
  ["ASCENDANT 2", "ascendant2"],
  ["ASCENDANT 3", "ascendant3"],
  ["IMMORTAL 1", "immortal1"],
  ["IMMORTAL 2", "immortal2"],
  ["IMMORTAL 3", "immortal3"],
  ["RADIANT", "radiant"],
];

function ensureDir(
  path
) {
  mkdirSync(
    path,
    {
      recursive: true,
    }
  );
}

function normalizeTierName(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toUpperCase();
}

function isHttpsUrl(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    return false;
  }

  try {
    return (
      new URL(
        value
      ).protocol ===
      "https:"
    );
  } catch {
    return false;
  }
}

function usableTierMap(
  set
) {
  const map =
    new Map();

  if (
    !Array.isArray(
      set?.tiers
    )
  ) {
    return map;
  }

  for (
    const tier of
    set.tiers
  ) {
    const name =
      normalizeTierName(
        tier?.tierName
      );

    if (
      !name ||
      !isHttpsUrl(
        tier?.largeIcon
      )
    ) {
      continue;
    }

    map.set(
      name,
      tier
    );
  }

  return map;
}

function scoreTierSet(
  set
) {
  const map =
    usableTierMap(
      set
    );

  let score = 0;

  for (
    const [name] of
    EXPECTED_RANKS
  ) {
    if (
      map.has(
        name
      )
    ) {
      score += 1;
    }
  }

  return score;
}

function selectBestTierSet(
  data
) {
  if (
    !Array.isArray(
      data
    )
  ) {
    return null;
  }

  let best =
    null;

  let bestScore =
    -1;

  // On a tie, later entries win. This is useful because
  // Valorant-API returns historical tier sets as well.
  for (
    const set of
    data
  ) {
    const score =
      scoreTierSet(
        set
      );

    if (
      score >= bestScore
    ) {
      best =
        set;
      bestScore =
        score;
    }
  }

  return {
    set:
      best,
    score:
      bestScore,
  };
}

async function fetchJson(
  url
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "Valorant-Tracker-Bot-Cosmetics-V2/1.0",
          Accept:
            "application/json",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} while fetching ${url}`
    );
  }

  return response.json();
}

async function downloadImage(
  url,
  destination
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "Valorant-Tracker-Bot-Cosmetics-V2/1.0",
          Accept:
            "image/*",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} while downloading ${url}`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  if (
    contentType &&
    !contentType
      .toLowerCase()
      .startsWith(
        "image/"
      )
  ) {
    throw new Error(
      `Expected an image from ${url}, got ${contentType}`
    );
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  if (
    buffer.length <
      100
  ) {
    throw new Error(
      `Downloaded image was unexpectedly small: ${url}`
    );
  }

  writeFileSync(
    destination,
    buffer
  );

  return buffer.length;
}

function readExistingManifest() {
  const candidates = [
    manifestPath,
    generatedManifestPath,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      !existsSync(
        candidate
      )
    ) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          readFileSync(
            candidate,
            "utf8"
          )
        );

      if (
        parsed &&
        parsed.version === 1
      ) {
        return parsed;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return {
    version: 1,
    source: {
      provider:
        "mixed",
    },
    ranks: {},
    agents: {},
    themes: {},
  };
}

function previousAgentSource(
  manifest
) {
  const components =
    manifest?.source?.components;

  if (
    components &&
    typeof components.agents ===
      "string"
  ) {
    return components.agents;
  }

  if (
    manifest?.source?.provider ===
      "riot-public-content-catalog"
  ) {
    const release =
      typeof manifest?.source?.release ===
        "string"
        ? manifest.source.release
        : "unknown";

    return `Riot Public Content Catalog release ${release}`;
  }

  return "existing generated agent asset set";
}

async function main() {
  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    " Cosmetics V2 - Rank Emblem Import"
  );
  console.log(
    "=========================================="
  );
  console.log("");
  console.log(
    "Fetching competitive tier metadata from Valorant-API.com..."
  );

  const response =
    await fetchJson(
      COMPETITIVE_TIERS_URL
    );

  if (
    response?.status !== 200 ||
    !Array.isArray(
      response?.data
    )
  ) {
    throw new Error(
      "Unexpected /v1/competitivetiers response shape."
    );
  }

  const selected =
    selectBestTierSet(
      response.data
    );

  if (
    !selected?.set
  ) {
    throw new Error(
      "No competitive tier set was available."
    );
  }

  const tierMap =
    usableTierMap(
      selected.set
    );

  const missing =
    EXPECTED_RANKS
      .filter(
        ([name]) =>
          !tierMap.has(
            name
          )
      )
      .map(
        ([name]) =>
          name
      );

  const selectedUuid =
    typeof selected.set.uuid ===
      "string"
      ? selected.set.uuid
      : "unknown";

  if (
    selected.score !==
      EXPECTED_RANKS.length ||
    missing.length > 0
  ) {
    ensureDir(
      outputRoot
    );

    const failureReport = {
      endpoint:
        COMPETITIVE_TIERS_URL,
      selectedTierSetUuid:
        selectedUuid,
      score:
        selected.score,
      expected:
        EXPECTED_RANKS.length,
      missing,
      availableTierNames:
        [
          ...tierMap.keys(),
        ],
    };

    writeFileSync(
      reportPath,
      `${JSON.stringify(
        failureReport,
        null,
        2
      )}\n`,
      "utf8"
    );

    throw new Error(
      [
        `The best competitive tier set matched only ${selected.score}/${EXPECTED_RANKS.length} expected ranks.`,
        `Report: ${reportPath}`,
      ].join(
        "\n"
      )
    );
  }

  const existing =
    readExistingManifest();

  rmSync(
    rankOutputDir,
    {
      recursive: true,
      force: true,
    }
  );

  ensureDir(
    rankOutputDir
  );

  const ranks = {};
  const downloaded = [];

  console.log(
    `Selected tier set: ${selectedUuid}`
  );
  console.log("");
  console.log(
    "Downloading 25 competitive rank emblems..."
  );

  for (
    const [
      rankName,
      key,
    ] of EXPECTED_RANKS
  ) {
    const tier =
      tierMap.get(
        rankName
      );

    const sourceUrl =
      tier.largeIcon;

    const destination =
      join(
        rankOutputDir,
        `${key}.png`
      );

    const bytes =
      await downloadImage(
        sourceUrl,
        destination
      );

    const publicUrl =
      `${baseUrl}/assets/valorant/ranks/${key}.png`;

    ranks[key] =
      publicUrl;

    downloaded.push({
      rankName,
      key,
      tier:
        tier.tier ?? null,
      sourceUrl,
      bytes,
      publicUrl,
    });

    console.log(
      `  OK  ${rankName} -> ${key}.png`
    );
  }

  const agentSource =
    previousAgentSource(
      existing
    );

  const manifest = {
    version: 1,

    source: {
      provider:
        "mixed",

      release:
        `agents: Riot PCC; ranks: Valorant-API tier set ${selectedUuid}`,

      generatedAt:
        new Date().toISOString(),

      components: {
        agents:
          agentSource,

        ranks:
          `Valorant-API.com /v1/competitivetiers, tier set ${selectedUuid}; static images copied locally during build`,
      },
    },

    ranks,

    agents:
      existing?.agents &&
      typeof existing.agents ===
        "object"
        ? existing.agents
        : {},

    themes:
      existing?.themes &&
      typeof existing.themes ===
        "object"
        ? existing.themes
        : {},
  };

  ensureDir(
    dirname(
      manifestPath
    )
  );

  const manifestText =
    `${JSON.stringify(
      manifest,
      null,
      2
    )}\n`;

  writeFileSync(
    manifestPath,
    manifestText,
    "utf8"
  );

  writeFileSync(
    generatedManifestPath,
    manifestText,
    "utf8"
  );

  const report = {
    endpoint:
      COMPETITIVE_TIERS_URL,

    sourceType:
      "community-maintained-static-asset-mirror",

    selectedTierSetUuid:
      selectedUuid,

    resolved:
      downloaded.length,

    expected:
      EXPECTED_RANKS.length,

    downloaded,

    manifestPath,
  };

  writeFileSync(
    reportPath,
    `${JSON.stringify(
      report,
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log("");
  console.log(
    "------------------------------------------"
  );
  console.log(
    `Rank emblems: ${downloaded.length}/${EXPECTED_RANKS.length}`
  );
  console.log(
    `Agents preserved: ${Object.keys(manifest.agents).length}`
  );
  console.log(
    "------------------------------------------"
  );
  console.log("");
  console.log(
    "Phase 4C rank import succeeded."
  );
  console.log("");
  console.log(
    "Do NOT deploy generated-netlify-assets yet."
  );
  console.log(
    "Return to ChatGPT with: Phase 4C import succeeded"
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "Phase 4C rank import failed:"
    );
    console.error(
      error instanceof Error
        ? error.message
        : error
    );
    console.error("");
    console.error(
      "If RANK-IMPORT-REPORT.json exists, upload it to ChatGPT."
    );
    process.exitCode = 1;
  }
);
