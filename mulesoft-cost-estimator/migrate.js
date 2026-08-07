#!/usr/bin/env node

/**
 * migrate-mulesoft-capacity.js
 *
 * Converts the older MuleSoft Capacity Planner JSON structure
 * to the newer structure using only built-in Node.js modules.
 *
 * Usage:
 *   node migrate-mulesoft-capacity.js \
 *     mulesoft-capacity-old.json \
 *     mulesoft-capacity-migrated.json
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];

const outputPath =
  process.argv[3] ||
  path.join(
    inputPath ? path.dirname(inputPath) : ".",
    "mulesoft-capacity-migrated.json"
  );

if (!inputPath) {
  console.error(
    "Usage: node migrate-mulesoft-capacity.js <old.json> [migrated.json]"
  );
  process.exit(1);
}

/**
 * The old structure does not contain architectureLayer.
 *
 * For APIs where we know the intended layer, explicitly map them here.
 * Keys can be either API IDs or API names.
 */
const ARCHITECTURE_LAYER_OVERRIDES = {
  "Checkout Experience API": "experience",
  "Inventory Availability API": "system",
  "Fulfillment Orchestration API": "process",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(value, null, 2) + "\n",
    "utf8"
  );
}

function getYearFromMonth(month) {
  if (typeof month !== "string") {
    return null;
  }

  const match = /^(\d{4})-\d{2}$/.exec(month);

  return match ? Number(match[1]) : null;
}

/**
 * Determine sampleYear from the planning data.
 *
 * We intentionally don't use createdAt/updatedAt because those
 * represent when the JSON was created, not the capacity planning year.
 */
function determineSampleYear(data) {
  const years = [];

  for (const entry of data.capacityEntries || []) {
    const year = getYearFromMonth(entry.effectiveMonth);

    if (year) {
      years.push(year);
    }
  }

  for (const project of data.projects || []) {
    for (const item of project.lifecycle || []) {
      const year = getYearFromMonth(item.effectiveMonth);

      // Ignore built-in dates such as 2000-01.
      if (year && year > 2000) {
        years.push(year);
      }
    }

    for (const item of project.reservations || []) {
      const year = getYearFromMonth(item.effectiveMonth);

      if (year && year > 2000) {
        years.push(year);
      }
    }
  }

  for (const api of data.apis || []) {
    for (const collectionName of [
      "owners",
      "lifecycle",
      "baseFlows",
      "allocations",
    ]) {
      for (const item of api[collectionName] || []) {
        const year = getYearFromMonth(item.effectiveMonth);

        if (year) {
          years.push(year);
        }
      }
    }

    for (const environmentName of ["dev", "test", "prod"]) {
      for (
        const item of
        api.environments?.[environmentName] || []
      ) {
        const year = getYearFromMonth(item.effectiveMonth);

        if (year) {
          years.push(year);
        }
      }
    }
  }

  if (years.length === 0) {
    throw new Error(
      "Could not determine metadata.sampleYear from the old data."
    );
  }

  return Math.min(...years);
}

/**
 * The old JSON has no architectureLayer field.
 *
 * First use explicit mappings. If there is no explicit mapping,
 * make a conservative guess based on the API name/description.
 */
function determineArchitectureLayer(api) {
  const explicit =
    ARCHITECTURE_LAYER_OVERRIDES[api.id] ||
    ARCHITECTURE_LAYER_OVERRIDES[api.name];

  if (explicit) {
    return explicit;
  }

  const text =
    `${api.name || ""} ${api.description || ""}`.toLowerCase();

  if (text.includes("experience")) {
    return "experience";
  }

  if (
    text.includes("orchestration") ||
    text.includes("process api") ||
    text.includes("process-api")
  ) {
    return "process";
  }

  if (
    text.includes("system api") ||
    text.includes("system-api") ||
    text.includes("inventory")
  ) {
    return "system";
  }

  console.warn(
    `WARNING: Could not confidently determine architectureLayer ` +
      `for "${api.name || api.id}". Defaulting to "process".`
  );

  return "process";
}

function migrateApi(api) {
  return {
    ...api,

    architectureLayer:
      api.architectureLayer ||
      determineArchitectureLayer(api),

    archive: api.archive ?? null,
  };
}

function migrate(oldData) {
  if (
    !oldData ||
    typeof oldData !== "object" ||
    Array.isArray(oldData)
  ) {
    throw new Error("Input must be a JSON object.");
  }

  const sampleYear =
    oldData.metadata?.sampleYear ??
    determineSampleYear(oldData);

  const migrated = {
    schemaVersion: oldData.schemaVersion ?? 1,

    metadata: {
      ...(oldData.metadata || {}),
      sampleYear,
    },

    capacityEntries: Array.isArray(
      oldData.capacityEntries
    )
      ? oldData.capacityEntries
      : [],

    projects: Array.isArray(oldData.projects)
      ? oldData.projects
      : [],

    apis: Array.isArray(oldData.apis)
      ? oldData.apis.map(migrateApi)
      : [],

    /**
     * This collection exists in the new structure
     * but did not exist in the old structure.
     */
    nonApiWorkloads: Array.isArray(
      oldData.nonApiWorkloads
    )
      ? oldData.nonApiWorkloads
      : [],
  };

  /**
   * strategicReserves existed in the old structure,
   * but does not exist in the new structure.
   *
   * We intentionally do NOT convert these values into
   * capacityEntries or reservations because that would
   * change their meaning.
   */
  if (oldData.strategicReserves) {
    console.warn(
      "WARNING: strategicReserves exists in the old file " +
        "but has no equivalent field in the new schema, " +
        "so it was not migrated."
    );
  }

  return migrated;
}

try {
  const oldData = readJson(inputPath);

  const migratedData = migrate(oldData);

  writeJson(
    outputPath,
    migratedData
  );

  console.log("Migration complete.");
  console.log(`Input : ${inputPath}`);
  console.log(`Output: ${outputPath}`);
} catch (error) {
  console.error(
    `Migration failed: ${error.message}`
  );

  process.exit(1);
}