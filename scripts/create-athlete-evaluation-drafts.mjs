import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function safeMessage(error) {
  return String(error?.message ?? "Unknown error")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 800);
}

if (process.argv.includes("--help")) {
  console.log(`Create missing SES assessment drafts for all published NBA athlete profiles.

Usage:
  node scripts/create-athlete-evaluation-drafts.mjs [options]

Options:
  --as-of=YYYY-MM-DD         Assessment date (default: current UTC date)
  --market=china|north-america  Target market (default: china)
  --scenario=china-priority|north-america|product-portfolio
                             Weight scenario (default: china-priority)
  --locale=zh|en             Candidate display name (default: zh)
  --apply                    Persist drafts; without this flag the script is read-only
`);
  process.exit(0);
}

const asOfDate = readOption("as-of", new Date().toISOString().slice(0, 10));
const market = readOption("market", "china");
const scenario = readOption("scenario", "china-priority");
const locale = readOption("locale", "zh");
const apply = process.argv.includes("--apply");
const allowedScenarios = new Set(["china-priority", "north-america", "product-portfolio"]);

if (!isDate(asOfDate)) throw new Error("--as-of must be a real date in YYYY-MM-DD format.");
if (asOfDate > new Date().toISOString().slice(0, 10)) throw new Error("--as-of cannot be later than today.");
if (market !== "china" && market !== "north-america") throw new Error("--market must be china or north-america.");
if (!allowedScenarios.has(scenario)) throw new Error("--scenario is not supported.");
if (locale !== "zh" && locale !== "en") throw new Error("--locale must be zh or en.");

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is not configured.");

neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

try {
  const modelResult = await pool.query(
    `SELECT version, configuration
     FROM athlete_evaluation_models
     WHERE active = true
     LIMIT 1`,
  );
  const activeModel = modelResult.rows[0];
  if (!activeModel) throw new Error("No active SES model found. Apply the project migrations first.");

  const modelConfiguration = typeof activeModel.configuration === "string"
    ? JSON.parse(activeModel.configuration)
    : activeModel.configuration;
  if (modelConfiguration.version !== activeModel.version) {
    throw new Error("Active model version does not match its configuration.");
  }
  const metricKeys = Object.values(modelConfiguration.metricWeights ?? {})
    .flatMap((weights) => Object.keys(weights ?? {}));
  if (!metricKeys.length || new Set(metricKeys).size !== metricKeys.length) {
    throw new Error("Active model has no valid metric definitions.");
  }

  const athleteResult = await pool.query(
    `SELECT athlete.id, athlete.name_zh, athlete.name_en
     FROM star_athletes AS athlete
     INNER JOIN star_sports AS sport ON sport.id = athlete.sport_id
     WHERE sport.slug = 'basketball'
       AND athlete.published = true
       AND lower(coalesce(athlete.league, '')) = 'nba'
     ORDER BY athlete.sort_order, athlete.name_en`,
  );

  let created = 0;
  let skipped = 0;
  const client = await pool.connect();
  try {
    for (const athlete of athleteResult.rows) {
      const candidateName = locale === "en" ? athlete.name_en : athlete.name_zh;
      const idempotencyKey = [
        "athlete-evaluation-draft",
        athlete.id,
        activeModel.version,
        asOfDate,
        market,
        scenario,
      ].join(":");

      if (apply) {
        await client.query("BEGIN");
        try {
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
            [idempotencyKey],
          );
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }

      let existing;
      try {
        existing = await client.query(
          `SELECT id
           FROM athlete_evaluation_runs
           WHERE athlete_id = $1
             AND model_version = $2
             AND as_of_date = $3::date
             AND market = $4
             AND scenario = $5::athlete_evaluation_scenario
           LIMIT 1`,
          [athlete.id, activeModel.version, asOfDate, market, scenario],
        );
      } catch (error) {
        if (apply) await client.query("ROLLBACK");
        throw error;
      }

      if (existing.rowCount) {
        skipped += 1;
        if (apply) await client.query("COMMIT");
        continue;
      }

      if (!apply) {
        created += 1;
        continue;
      }

      try {
        const dimensions = JSON.stringify({ D1: null, D2: null, D3: null, D4: null, D5: null, D6: null });
        const sensitivity = JSON.stringify({ "china-priority": null, "north-america": null, "product-portfolio": null });
        const gates = JSON.stringify(["competitor_contract_unknown"]);
        const inserted = await client.query(
          `INSERT INTO athlete_evaluation_runs
             (athlete_id, candidate_name, model_version, as_of_date, market, scenario, dimensions, sensitivity, gates, eligibility, status)
           VALUES ($1, $2, $3, $4::date, $5, $6::athlete_evaluation_scenario, $7::jsonb, $8::jsonb, $9::jsonb, 'review_required', 'insufficient_data')
           RETURNING id`,
          [athlete.id, candidateName, activeModel.version, asOfDate, market, scenario, dimensions, sensitivity, gates],
        );
        const runId = inserted.rows[0]?.id;
        if (!runId) throw new Error(`Could not create an assessment draft for athlete ${athlete.id}.`);
        await client.query(
          `INSERT INTO athlete_evaluation_metric_scores (run_id, metric_key, status)
           SELECT $1::uuid, metric_key, 'missing'::athlete_evaluation_metric_status
           FROM unnest($2::text[]) AS metric_keys(metric_key)
           ON CONFLICT (run_id, metric_key) DO NOTHING`,
          [runId, metricKeys],
        );
        await client.query("COMMIT");
        created += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }

  const mode = apply ? "Persisted" : "Dry run";
  console.log(`${mode}: ${created} draft(s) ${apply ? "created" : "would be created"}; ${skipped} existing draft(s) skipped.`);
  console.log(`Model ${activeModel.version}; ${asOfDate}; ${market}; ${scenario}; ${locale}.`);
  console.log("Drafts contain unknown metrics only; this workflow does not populate scores or sources.");
  if (!apply) console.log("Add --apply to write drafts to the configured database.");
} catch (error) {
  console.error("Could not prepare athlete assessment drafts:", safeMessage(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
