#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const command = process.argv[2] ?? "status";
const args = process.argv.slice(3);
const repoRoot = getRepoRoot();
const branch = getGitBranch();
const coordinationDir = path.resolve(repoRoot, "../speed-cube-hub-coordination");
const claimsFile = path.join(coordinationDir, "ACTIVE_CLAIMS.md");
const lockDir = path.join(coordinationDir, ".claims.lock");
const staleMinutes = 240;

async function main() {
  ensureCoordinationDir();
  ensureClaimsFile();

  switch (command) {
    case "status":
      printStatus(readClaimsData());
      return;
    case "claim":
      await withLock(async () => {
        const options = parseOptions(args);
        const data = readClaimsData();
        const next = upsertClaim(data, options);
        writeClaimsData(next);
        console.log(`Claimed ${options.files.length} path(s) for ${options.task}.`);
        printStatus(next);
      });
      return;
    case "release":
      await withLock(async () => {
        const options = parseOptions(args);
        const data = readClaimsData();
        const next = releaseClaim(data, options);
        writeClaimsData(next);
        console.log(`Released claim for ${options.cwd}.`);
        printStatus(next);
      });
      return;
    case "touch":
      await withLock(async () => {
        const options = parseOptions(args);
        const data = readClaimsData();
        const next = touchClaim(data, options);
        writeClaimsData(next);
        console.log(`Refreshed claim heartbeat for ${options.cwd}.`);
        printStatus(next);
      });
      return;
    default:
      usage();
      process.exitCode = 1;
  }
}

function usage() {
  console.log(`Usage:
  npm run claims:status
  npm run claims:claim -- --task "Task name" --files "src/a.ts,src/b.ts"
  npm run claims:touch
  npm run claims:release

Direct script:
  node scripts/agent-claims.mjs status
  node scripts/agent-claims.mjs claim --task "Task name" --files "src/a.ts,src/b.ts"
  node scripts/agent-claims.mjs touch
  node scripts/agent-claims.mjs release

Options:
  --task    Required for claim.
  --files   Required for claim. Comma-separated repo-relative paths.
  --agent   Optional label. Defaults to the current worktree folder name.
  --cwd     Optional absolute worktree path. Defaults to the current repo root.
  --branch  Optional branch name. Defaults to the current git branch.
  --force   Optional. Overrides overlapping-path protection for claim.
`);
}

function getRepoRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

function getGitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function ensureCoordinationDir() {
  fs.mkdirSync(coordinationDir, { recursive: true });
}

function ensureClaimsFile() {
  if (!fs.existsSync(claimsFile)) {
    writeClaimsData(createEmptyData());
  }
}

function createEmptyData() {
  return {
    updatedAt: new Date().toISOString(),
    claims: [],
  };
}

function parseOptions(rawArgs) {
  const options = {
    agent: path.basename(repoRoot),
    branch,
    cwd: repoRoot,
    task: "",
    files: [],
    force: false,
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    const value = rawArgs[i + 1];
    if (!value) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--agent":
        options.agent = value.trim() || options.agent;
        i += 1;
        break;
      case "--branch":
        options.branch = value.trim() || options.branch;
        i += 1;
        break;
      case "--cwd":
        options.cwd = path.resolve(value.trim());
        i += 1;
        break;
      case "--task":
        options.task = value.trim();
        i += 1;
        break;
      case "--files":
        options.files.push(...value.split(",").map((entry) => entry.trim()).filter(Boolean));
        i += 1;
        break;
      case "--file":
        options.files.push(value.trim());
        i += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.files = options.files.map(normalizeClaimPath);
  return options;
}

function normalizeClaimPath(input) {
  const trimmed = input.replace(/\\/g, "/").trim();
  if (!trimmed || trimmed === ".") {
    return ".";
  }

  if (path.isAbsolute(trimmed)) {
    const relative = path.relative(repoRoot, trimmed).split(path.sep).join("/");
    if (relative.startsWith("..")) {
      throw new Error(`Claim path is outside this repo: ${input}`);
    }
    return normalizeRelativePath(relative);
  }

  return normalizeRelativePath(trimmed);
}

function normalizeRelativePath(value) {
  const withoutDot = value.replace(/^\.\//, "").replace(/\/+$/, "");
  return withoutDot || ".";
}

function readClaimsData() {
  const raw = fs.readFileSync(claimsFile, "utf8");
  const match = raw.match(/<!-- ACTIVE_CLAIMS_JSON_START\n([\s\S]*?)\nACTIVE_CLAIMS_JSON_END -->/);
  if (!match) {
    return createEmptyData();
  }

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed.claims)) {
      return createEmptyData();
    }
    return parsed;
  } catch {
    return createEmptyData();
  }
}

function writeClaimsData(data) {
  const next = {
    updatedAt: new Date().toISOString(),
    claims: [...data.claims].sort((a, b) => a.cwd.localeCompare(b.cwd)),
  };
  fs.writeFileSync(claimsFile, renderMarkdown(next));
}

function renderMarkdown(data) {
  const rows = data.claims.length > 0
    ? data.claims.map((claim) => {
        const worktree = path.basename(claim.cwd);
        const files = claim.files.map((file) => escapeCell(file)).join("<br>");
        const updated = formatStaleLabel(claim.updatedAt);
        return `| ${escapeCell(claim.agent)} | ${escapeCell(claim.task)} | ${escapeCell(claim.branch)} | ${escapeCell(worktree)} | ${files || "-"} | ${escapeCell(claim.claimedAt)} | ${escapeCell(updated)} |`;
      }).join("\n")
    : "| _none_ | - | - | - | - | - | - |";

  return `# Active Claims\n\nShared live file-lock registry for all Speed Cube Hub worktrees. Read this before editing any file.\n\n- Managed by \`scripts/agent-claims.mjs\` from any worktree\n- From any worktree, use \`npm run claims:status\`, \`npm run claims:claim -- --task \"...\" --files \"src/...\"\`, \`npm run claims:touch\`, and \`npm run claims:release\`\n- Put completed implementation notes in \`AGENT_LOG.md\`; this file is only for active locks\n\nLast updated: ${data.updatedAt}\n\n## Active Claims\n\n| Agent | Task | Branch | Worktree | Files | Claimed | Updated |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Conflict Rule\n\nIf a file or directory is already claimed here, another agent should not edit it until that claim is released.\n\n<!-- ACTIVE_CLAIMS_JSON_START\n${JSON.stringify(data, null, 2)}\nACTIVE_CLAIMS_JSON_END -->\n`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatStaleLabel(timestamp) {
  const updatedMs = Date.parse(timestamp);
  if (!Number.isFinite(updatedMs)) {
    return timestamp;
  }
  const ageMinutes = Math.floor((Date.now() - updatedMs) / 60000);
  if (ageMinutes > staleMinutes) {
    return `${timestamp} (stale?)`;
  }
  return timestamp;
}

function upsertClaim(data, options) {
  if (!options.task) {
    throw new Error("Missing required --task value for claim.");
  }
  if (options.files.length === 0) {
    throw new Error("Missing required --files value for claim.");
  }

  const otherClaims = data.claims.filter((claim) => claim.cwd !== options.cwd);
  const conflicts = findConflicts(otherClaims, options.files);
  if (conflicts.length > 0 && !options.force) {
    const details = conflicts.map((conflict) => `${conflict.file} already claimed by ${conflict.agent} (${conflict.task})`).join("; ");
    throw new Error(`Claim conflict: ${details}`);
  }

  const claim = {
    agent: options.agent,
    branch: options.branch,
    cwd: options.cwd,
    task: options.task,
    files: dedupeAndSort(options.files),
    claimedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...data,
    claims: [...otherClaims, claim],
  };
}

function releaseClaim(data, options) {
  const nextClaims = data.claims.filter((claim) => claim.cwd !== options.cwd);
  if (nextClaims.length === data.claims.length) {
    throw new Error(`No active claim found for ${options.cwd}`);
  }
  return {
    ...data,
    claims: nextClaims,
  };
}

function touchClaim(data, options) {
  let found = false;
  const nextClaims = data.claims.map((claim) => {
    if (claim.cwd !== options.cwd) {
      return claim;
    }
    found = true;
    return {
      ...claim,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!found) {
    throw new Error(`No active claim found for ${options.cwd}`);
  }

  return {
    ...data,
    claims: nextClaims,
  };
}

function dedupeAndSort(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function findConflicts(existingClaims, nextFiles) {
  const conflicts = [];
  for (const claim of existingClaims) {
    for (const existingFile of claim.files) {
      for (const nextFile of nextFiles) {
        if (pathsOverlap(existingFile, nextFile)) {
          conflicts.push({ agent: claim.agent, task: claim.task, file: existingFile });
        }
      }
    }
  }
  return conflicts;
}

function pathsOverlap(left, right) {
  if (left === "." || right === ".") {
    return true;
  }
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

async function withLock(callback) {
  await acquireLock();
  try {
    await callback();
  } finally {
    releaseLock();
  }
}

async function acquireLock() {
  const timeoutMs = 10000;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      fs.mkdirSync(lockDir);
      return;
    } catch (error) {
      if (error && error.code !== "EEXIST") {
        throw error;
      }
      await sleep(100);
    }
  }
  throw new Error(`Could not acquire coordination lock at ${lockDir}`);
}

function releaseLock() {
  fs.rmSync(lockDir, { recursive: true, force: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printStatus(data) {
  console.log(`Claims file: ${claimsFile}`);
  if (data.claims.length === 0) {
    console.log("No active claims.");
    return;
  }

  for (const claim of data.claims) {
    console.log(`- ${claim.agent} | ${claim.task}`);
    console.log(`  branch: ${claim.branch}`);
    console.log(`  cwd: ${claim.cwd}`);
    console.log(`  files: ${claim.files.join(", ")}`);
    console.log(`  claimed: ${claim.claimedAt}`);
    console.log(`  updated: ${formatStaleLabel(claim.updatedAt)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exitCode = 1;
});
