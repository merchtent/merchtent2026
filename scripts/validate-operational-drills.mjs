import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const evidenceDirectory = join(process.cwd(), "operations", "drills", "evidence");
const requiredTypes = ["backup_restore", "supplier_outage"];
const maxAgeDays = Number(process.env.DRILL_MAX_AGE_DAYS ?? "90");
const failures = [];
let files = [];

try {
  files = (await readdir(evidenceDirectory)).filter((file) => file.endsWith(".json") && !file.endsWith(".example.json"));
} catch {
  failures.push(`No drill evidence directory found at ${evidenceDirectory}`);
}

const records = [];
for (const file of files) {
  try {
    const record = JSON.parse(await readFile(join(evidenceDirectory, file), "utf8"));
    records.push({ file, ...record });
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

for (const type of requiredTypes) {
  const matching = records
    .filter((record) => record.drill_type === type && record.result === "passed")
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));

  if (!matching.length) {
    failures.push(`A passed ${type} drill is required`);
    continue;
  }

  const latest = matching[0];
  const completedAt = Date.parse(latest.completed_at);
  if (!Number.isFinite(completedAt)) {
    failures.push(`${latest.file} has an invalid completed_at timestamp`);
  } else if (Date.now() - completedAt > maxAgeDays * 24 * 60 * 60 * 1000) {
    failures.push(`${latest.file} is older than ${maxAgeDays} days`);
  }

  for (const key of ["operator", "environment", "git_commit", "evidence_url", "actual_rto_minutes", "observed_rpo_minutes", "follow_up_owner"]) {
    if (latest[key] === undefined || latest[key] === null || latest[key] === "") {
      failures.push(`${latest.file} is missing ${key}`);
    }
  }

  if (!Array.isArray(latest.validations) || latest.validations.length === 0 || latest.validations.some((item) => item?.passed !== true)) {
    failures.push(`${latest.file} must contain passed validation evidence`);
  }
}

if (failures.length) {
  console.error("Operational drill validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Operational drill evidence passed for ${requiredTypes.join(" and ")} (maximum age ${maxAgeDays} days).`);
