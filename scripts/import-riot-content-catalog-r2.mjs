import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  basename,
  dirname,
  join,
  relative,
} from "node:path";

const root =
  process.cwd();

const release =
  "13.04";

const catalogRoot =
  join(
    root,
    ".cache",
    "riot-content-catalog",
    `release-${release}`
  );

const catalogJsonPath =
  join(
    catalogRoot,
    "PublicContentCatalog.json"
  );

const charactersDir =
  join(
    catalogRoot,
    "Characters"
  );

const outputRoot =
  join(
    root,
    "generated-netlify-assets"
  );

const outputAgentsDir =
  join(
    outputRoot,
    "assets",
    "valorant",
    "agents"
  );

const outputManifestPath =
  join(
    outputRoot,
    "assets",
    "valorant",
    "appearance-assets.json"
  );

const outputReportPath =
  join(
    outputRoot,
    "IMPORT-REPORT.json"
  );

const generatedManifestPath =
  join(
    root,
    "appearance-assets.generated.json"
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

function normalizeAgentKey(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ""
    );
}

function collectStrings(
  value,
  output = []
) {
  if (
    typeof value ===
      "string"
  ) {
    output.push(
      value
    );

    return output;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    for (
      const child of
      value
    ) {
      collectStrings(
        child,
        output
      );
    }

    return output;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    for (
      const child of
      Object.values(
        value
      )
    ) {
      collectStrings(
        child,
        output
      );
    }
  }

  return output;
}

function firstLocalizedName(
  character
) {
  const directCandidates = [
    character?.name?.defaultText,
    character?.name?.localizedByCulture?.["en-US"],
    character?.displayName,
    character?.name,
  ];

  for (
    const candidate of
    directCandidates
  ) {
    if (
      typeof candidate ===
        "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
}

function uuidCandidates(
  value
) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return [
    ...new Set(
      collectStrings(
        value
      ).filter(
        (text) =>
          uuidPattern.test(
            text
          )
      )
    ),
  ];
}

function findCharacterImageSet(
  character
) {
  for (
    const id of
    uuidCandidates(
      character
    )
  ) {
    const upper =
      id.toUpperCase();

    const candidates = {
      small:
        join(
          charactersDir,
          `${upper}_small.png`
        ),

      bust:
        join(
          charactersDir,
          `${upper}_bust.png`
        ),

      standard:
        join(
          charactersDir,
          `${upper}.png`
        ),

      full:
        join(
          charactersDir,
          `${upper}_full.png`
        ),
    };

    if (
      Object.values(
        candidates
      ).some(
        existsSync
      )
    ) {
      return {
        id:
          upper,
        ...candidates,
      };
    }
  }

  return null;
}

function chooseThumbnail(
  images
) {
  // _small is Riot's compact character art in this catalog.
  // Fall back safely for catalog entries that omit a variant.
  const ordered = [
    images.small,
    images.bust,
    images.standard,
    images.full,
  ];

  return (
    ordered.find(
      existsSync
    ) ?? null
  );
}

function safeCharacterArray(
  catalog
) {
  if (
    Array.isArray(
      catalog?.characters
    )
  ) {
    return catalog.characters;
  }

  if (
    Array.isArray(
      catalog?.Characters
    )
  ) {
    return catalog.Characters;
  }

  return [];
}

function main() {
  if (
    !existsSync(
      catalogJsonPath
    ) ||
    !existsSync(
      charactersDir
    )
  ) {
    throw new Error(
      [
        "The extracted Riot catalog could not be found.",
        "",
        `Expected JSON: ${catalogJsonPath}`,
        `Expected folder: ${charactersDir}`,
        "",
        "Run IMPORT-RIOT-ASSETS.bat from the previous Phase 4B package once",
        "so the official catalog is downloaded/extracted, then run this R2 importer.",
      ].join(
        "\n"
      )
    );
  }

  const catalog =
    JSON.parse(
      readFileSync(
        catalogJsonPath,
        "utf8"
      )
    );

  const characters =
    safeCharacterArray(
      catalog
    );

  if (
    characters.length === 0
  ) {
    throw new Error(
      "PublicContentCatalog.json did not contain a characters array."
    );
  }

  rmSync(
    outputRoot,
    {
      recursive: true,
      force: true,
    }
  );

  ensureDir(
    outputAgentsDir
  );

  const agents = {};
  const discovered = [];
  const skipped = [];

  for (
    const character of
    characters
  ) {
    const name =
      firstLocalizedName(
        character
      );

    if (
      !name ||
      /null ui data/i.test(
        name
      )
    ) {
      skipped.push({
        name:
          name ??
          "<unnamed>",
        reason:
          "missing usable display name",
      });

      continue;
    }

    const images =
      findCharacterImageSet(
        character
      );

    if (!images) {
      skipped.push({
        name,
        reason:
          "no matching Characters/<UUID> image set",
      });

      continue;
    }

    const source =
      chooseThumbnail(
        images
      );

    if (!source) {
      skipped.push({
        name,
        reason:
          "image set found but no usable PNG variant",
      });

      continue;
    }

    const key =
      normalizeAgentKey(
        name
      );

    if (!key) {
      skipped.push({
        name,
        reason:
          "agent name did not normalize to a key",
      });

      continue;
    }

    const destination =
      join(
        outputAgentsDir,
        `${key}.png`
      );

    copyFileSync(
      source,
      destination
    );

    const url =
      `${baseUrl}/assets/valorant/agents/${key}.png`;

    agents[key] =
      url;

    discovered.push({
      name,
      key,
      riotId:
        images.id,
      sourceFile:
        relative(
          catalogRoot,
          source
        ).replace(
          /\\/g,
          "/"
        ),
      outputFile:
        relative(
          root,
          destination
        ).replace(
          /\\/g,
          "/"
        ),
      url,
    });
  }

  const manifest = {
    version: 1,

    source: {
      provider:
        "riot-public-content-catalog",
      release,
      generatedAt:
        new Date().toISOString(),
    },

    // Riot's current Public Content Catalog contains the
    // agent art we use here, but it does not expose the
    // competitive rank-emblem set in this package.
    //
    // Keep this empty until a separately verified rank
    // asset source is added.
    ranks: {},

    agents,

    themes: {},
  };

  ensureDir(
    dirname(
      outputManifestPath
    )
  );

  const manifestJson =
    `${JSON.stringify(
      manifest,
      null,
      2
    )}\n`;

  writeFileSync(
    outputManifestPath,
    manifestJson,
    "utf8"
  );

  writeFileSync(
    generatedManifestPath,
    manifestJson,
    "utf8"
  );

  const requiredSmokeTestNames = [
    "jett",
    "fade",
    "kayo",
    "omen",
    "sage",
  ];

  const missingSmokeTests =
    requiredSmokeTestNames.filter(
      (key) =>
        !agents[key]
    );

  const report = {
    release,
    baseUrl,

    characterRecords:
      characters.length,

    resolvedAgents:
      Object.keys(
        agents
      ).length,

    discoveredAgents:
      discovered,

    skippedCharacters:
      skipped,

    smokeTestAgents:
      requiredSmokeTestNames,

    missingSmokeTestAgents:
      missingSmokeTests,

    ranks: {
      resolved:
        0,

      status:
        "not-present-in-riot-public-content-catalog",

      note:
        "The extracted Riot catalog contains Characters and many other static content groups, but no competitive-rank image group. Rank emblems need a separately verified source.",
    },
  };

  writeFileSync(
    outputReportPath,
    `${JSON.stringify(
      report,
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log("");
  console.log(
    "----------------------------------------"
  );
  console.log(
    " Cosmetics V2 Riot Agent Import R2"
  );
  console.log(
    "----------------------------------------"
  );
  console.log(
    `Character records: ${characters.length}`
  );
  console.log(
    `Agent images resolved: ${report.resolvedAgents}`
  );
  console.log(
    `Skipped records: ${skipped.length}`
  );
  console.log(
    "Rank emblems: deferred (not in this Riot catalog)"
  );
  console.log(
    "----------------------------------------"
  );
  console.log("");

  if (
    report.resolvedAgents < 20 ||
    missingSmokeTests.length > 0
  ) {
    console.log(
      "The agent import still needs refinement."
    );
    console.log(
      "Upload generated-netlify-assets\\IMPORT-REPORT.json to ChatGPT."
    );

    process.exitCode = 2;
    return;
  }

  console.log(
    "Riot agent asset import R2 succeeded."
  );
  console.log("");
  console.log(
    "Do NOT deploy generated-netlify-assets yet."
  );
  console.log(
    "Return to ChatGPT with: Phase 4B R2 succeeded"
  );
}

try {
  main();
} catch (error) {
  console.error("");
  console.error(
    "Riot agent import R2 failed:"
  );
  console.error(
    error instanceof Error
      ? error.message
      : error
  );
  process.exitCode = 1;
}
