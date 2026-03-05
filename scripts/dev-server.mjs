import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const command = process.argv[2];
const projectRoot = process.cwd();
const runtimeDir = path.join(projectRoot, ".dev-runtime");
const pidFile = path.join(runtimeDir, "next-dev.pid");
const logFile = path.join(runtimeDir, "next-dev.log");
const port = Number(process.env.PORT ?? "3000");

function usage() {
  console.log("Usage: node scripts/dev-server.mjs <up|down|status|logs>");
}

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function readPidFromFile() {
  if (!fs.existsSync(pidFile)) {
    return null;
  }

  const raw = fs.readFileSync(pidFile, "utf8").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Number(parsed.pid) || null;
  } catch {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

function writePidFile(pid) {
  ensureRuntimeDir();
  const payload = {
    pid,
    port,
    startedAt: new Date().toISOString(),
    logFile,
  };
  fs.writeFileSync(pidFile, `${JSON.stringify(payload, null, 2)}\n`);
}

function removePidFile() {
  fs.rmSync(pidFile, { force: true });
}

function isPidAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getCommandForPid(pid) {
  if (!pid) {
    return "";
  }
  try {
    return execSync(`ps -p ${pid} -o command=`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getListenerPid() {
  try {
    const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) {
      return null;
    }
    return Number(output.split("\n")[0]) || null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForListener(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const pid = getListenerPid();
    if (pid) {
      return pid;
    }
    await sleep(250);
  }
  return null;
}

function printLogTail(lines = 40) {
  if (!fs.existsSync(logFile)) {
    console.log(`No log file yet: ${logFile}`);
    return;
  }
  const all = fs.readFileSync(logFile, "utf8").split(/\r?\n/);
  const tail = all.slice(Math.max(0, all.length - lines)).join("\n");
  console.log(tail);
}

async function up() {
  ensureRuntimeDir();

  const trackedPid = readPidFromFile();
  if (trackedPid && isPidAlive(trackedPid)) {
    console.log(`Dev server already running (PID ${trackedPid})`);
    console.log(`URL: http://127.0.0.1:${port}`);
    return;
  }

  if (trackedPid) {
    removePidFile();
  }

  const existingListenerPid = getListenerPid();
  if (existingListenerPid) {
    console.error(
      `Port ${port} is already in use by PID ${existingListenerPid}. Stop that process first.`
    );
    process.exitCode = 1;
    return;
  }

  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    console.error("Could not find Next.js CLI binary. Run `npm install` first.");
    process.exitCode = 1;
    return;
  }

  const logFd = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=4096",
    },
  });

  child.unref();
  writePidFile(child.pid);

  const listenerPid = await waitForListener(15000);
  if (!listenerPid) {
    console.error("Dev server did not open the port within 15 seconds.");
    printLogTail(80);
    process.exitCode = 1;
    return;
  }

  console.log(`Dev server started.`);
  console.log(`PID file: ${pidFile}`);
  console.log(`Log file: ${logFile}`);
  console.log(`URL: http://127.0.0.1:${port}`);
}

async function down() {
  const trackedPid = readPidFromFile();

  if (!trackedPid) {
    const listenerPid = getListenerPid();
    if (listenerPid) {
      console.log(
        `Port ${port} is in use by PID ${listenerPid}, but no tracked PID file exists at ${pidFile}.`
      );
      console.log("Stop it manually, or run this command after starting with `npm run dev:up`.");
      return;
    }
    console.log("Dev server is not running.");
    return;
  }

  if (!isPidAlive(trackedPid)) {
    removePidFile();
    console.log("Removed stale PID file. Dev server is not running.");
    return;
  }

  let killed = false;
  try {
    // Detached process starts its own process group; kill group first for clean shutdown.
    process.kill(-trackedPid, "SIGTERM");
    killed = true;
  } catch {
    try {
      process.kill(trackedPid, "SIGTERM");
      killed = true;
    } catch {
      killed = false;
    }
  }

  if (!killed) {
    console.error(`Failed to signal PID ${trackedPid}.`);
    process.exitCode = 1;
    return;
  }

  for (let i = 0; i < 20; i += 1) {
    if (!isPidAlive(trackedPid)) {
      removePidFile();
      console.log("Dev server stopped.");
      return;
    }
    await sleep(250);
  }

  try {
    process.kill(-trackedPid, "SIGKILL");
  } catch {
    try {
      process.kill(trackedPid, "SIGKILL");
    } catch {
      // no-op
    }
  }

  removePidFile();
  console.log("Dev server force-stopped.");
}

function status() {
  const trackedPid = readPidFromFile();
  const listenerPid = getListenerPid();

  if (trackedPid && isPidAlive(trackedPid)) {
    console.log(`Status: running`);
    console.log(`Tracked PID: ${trackedPid}`);
    console.log(`Command: ${getCommandForPid(trackedPid)}`);
    console.log(`URL: http://127.0.0.1:${port}`);
    console.log(`Log file: ${logFile}`);
    return;
  }

  if (trackedPid && !isPidAlive(trackedPid)) {
    console.log("Status: stopped (stale PID file found)");
    return;
  }

  if (listenerPid) {
    console.log(`Status: running (untracked)`);
    console.log(`Listener PID on ${port}: ${listenerPid}`);
    return;
  }

  console.log("Status: stopped");
}

function logs() {
  printLogTail(120);
}

async function main() {
  switch (command) {
    case "up":
      await up();
      break;
    case "down":
      await down();
      break;
    case "status":
      status();
      break;
    case "logs":
      logs();
      break;
    default:
      usage();
      process.exitCode = 1;
      break;
  }
}

await main();
