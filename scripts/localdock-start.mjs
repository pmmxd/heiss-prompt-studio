import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = path.join(root, ".build-temp");
const stateFile = path.join(tempDir, "localdock-build.json");
const serverEntry = path.join(root, "server", "index.js");
const distEntry = path.join(root, "dist", "index.html");
const nodeModules = path.join(root, "node_modules");
const lockFile = path.join(root, "package-lock.json");

fs.mkdirSync(tempDir, { recursive: true });
process.env.TEMP = tempDir;
process.env.TMP = tempDir;

function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")
  ];
  return candidates.find((file) => file && fs.existsSync(file)) || "";
}

function runNpm(args) {
  console.log(`[LocalDock] npm ${args.join(" ")}`);
  const cli = npmCli();
  const result = cli
    ? spawnSync(process.execPath, [cli, ...args], { cwd: root, stdio: "inherit", env: process.env })
    : process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm", ...args], { cwd: root, stdio: "inherit", env: process.env })
      : spawnSync("npm", args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed with code ${result.status}`);
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function dependencyReady() {
  const marker = path.join(nodeModules, ".heiss-prompt-studio-lock");
  if (!fs.existsSync(nodeModules) || !fs.existsSync(marker)) return false;
  return fs.readFileSync(marker, "utf8").trim() === hashFile(lockFile);
}

function installDependencies() {
  if (dependencyReady()) return;
  runNpm(["ci", "--no-audit", "--no-fund"]);
  fs.writeFileSync(path.join(nodeModules, ".heiss-prompt-studio-lock"), hashFile(lockFile), "utf8");
}

function sourceFiles() {
  const files = ["index.html", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json"];
  const roots = ["src", "public", "server", "scripts"];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(root, full));
    }
  };
  for (const directory of roots) {
    const full = path.join(root, directory);
    if (fs.existsSync(full)) walk(full);
  }
  return files.filter((file) => fs.existsSync(path.join(root, file)));
}

function sourceFingerprint() {
  const hash = crypto.createHash("sha256");
  for (const relative of sourceFiles().sort()) {
    const full = path.join(root, relative);
    const stat = fs.statSync(full);
    hash.update(`${relative.replaceAll(path.sep, "/")}\0${stat.size}\0${stat.mtimeMs}\n`);
  }
  return hash.digest("hex");
}

function buildReady() {
  if (!fs.existsSync(distEntry) || !fs.existsSync(stateFile)) return false;
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8")).fingerprint === sourceFingerprint();
  } catch {
    return false;
  }
}

function buildApp() {
  if (buildReady()) return;
  console.log("[LocalDock] Source changed or dist is missing. Building HEISS Prompt Studio...");
  runNpm(["run", "build"]);
  fs.writeFileSync(stateFile, JSON.stringify({
    fingerprint: sourceFingerprint(),
    builtAt: new Date().toISOString()
  }, null, 2), "utf8");
}

installDependencies();
buildApp();

if (process.argv.includes("--prepare-only")) {
  console.log("[LocalDock] Dependencies and build are ready.");
  process.exit(0);
}

console.log("[LocalDock] Starting HEISS Prompt Studio server...");
const child = spawn(process.execPath, [serverEntry], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (child.exitCode === null) child.kill(signal || "SIGTERM");
}

for (const signal of process.platform === "win32" ? ["SIGINT", "SIGTERM", "SIGBREAK"] : ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

child.on("error", (error) => {
  console.error(`[LocalDock] Could not start server: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
