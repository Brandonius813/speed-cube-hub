#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const repoRoot = getRepoRoot();
const defaultBase = "origin/main";

function usage() {
  console.log(`Usage:
  npm run agent:bootstrap -- --task "Task name"

Options:
  --task    Required. Human-readable task name.
  --slug    Optional. Defaults to a slugified task name.
  --branch  Optional. Defaults to codex/<slug>.
  --path    Optional. Defaults to ../speed-cube-hub-<slug>.
  --base    Optional. Defaults to origin/main.
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

function parseOptions(rawArgs) {
  const options = {
    task: "",
    slug: "",
    branch: "",
    worktreePath: "",
    base: defaultBase,
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    const value = rawArgs[i + 1];
    if (!value) {
      throw new Error(`Missing value for ${arg}`);
    }

    switch (arg) {
      case "--task":
        options.task = value.trim();
        i += 1;
        break;
      case "--slug":
        options.slug = slugify(value);
        i += 1;
        break;
      case "--branch":
        options.branch = value.trim();
        i += 1;
        break;
      case "--path":
        options.worktreePath = path.resolve(value.trim());
        i += 1;
        break;
      case "--base":
        options.base = value.trim();
        i += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.task) {
    throw new Error("Missing required --task value.");
  }

  if (!options.slug) {
    options.slug = slugify(options.task);
  }
  if (!options.slug) {
    throw new Error("Could not derive a slug from the task name.");
  }

  if (!options.branch) {
    options.branch = `codex/${options.slug}`;
  }

  if (!options.worktreePath) {
    options.worktreePath = path.resolve(repoRoot, `../speed-cube-hub-${options.slug}`);
  }

  return options;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function run(command, cwd = repoRoot) {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function branchExists(branch) {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${shellEscape(branch)}`, {
      cwd: repoRoot,
      stdio: "ignore",
      shell: "/bin/zsh",
    });
    return true;
  } catch {
    return false;
  }
}

function isGitWorktree(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  try {
    execSync("git rev-parse --show-toplevel", {
      cwd: targetPath,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function ensureFetched(baseRef) {
  if (baseRef === defaultBase) {
    execSync("git fetch origin main", {
      cwd: repoRoot,
      stdio: "inherit",
      shell: "/bin/zsh",
    });
  }
}

function currentBranch(cwd) {
  try {
    return run("git rev-parse --abbrev-ref HEAD", cwd);
  } catch {
    return "unknown";
  }
}

function main() {
  try {
    const options = parseOptions(args);
    ensureFetched(options.base);

    if (isGitWorktree(options.worktreePath)) {
      console.log(`Reusing existing worktree.`);
      console.log(`TASK=${options.task}`);
      console.log(`WORKTREE=${options.worktreePath}`);
      console.log(`BRANCH=${currentBranch(options.worktreePath)}`);
      return;
    }

    if (fs.existsSync(options.worktreePath) && !isGitWorktree(options.worktreePath)) {
      throw new Error(`Path exists and is not a git worktree: ${options.worktreePath}`);
    }

    const escapedPath = shellEscape(options.worktreePath);
    const escapedBranch = shellEscape(options.branch);
    const escapedBase = shellEscape(options.base);

    if (branchExists(options.branch)) {
      execSync(`git worktree add ${escapedPath} ${escapedBranch}`, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: "/bin/zsh",
      });
    } else {
      execSync(`git worktree add ${escapedPath} -b ${escapedBranch} ${escapedBase}`, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: "/bin/zsh",
      });
    }

    console.log(`Created worktree.`);
    console.log(`TASK=${options.task}`);
    console.log(`WORKTREE=${options.worktreePath}`);
    console.log(`BRANCH=${options.branch}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    usage();
    process.exitCode = 1;
  }
}

main();
