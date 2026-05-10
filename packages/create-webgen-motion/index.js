#!/usr/bin/env node
/**
 * create-webgen-motion — scaffolds a fresh webgen-motion project.
 *
 *   npx create-webgen-motion@latest my-project
 *
 * Pipeline :
 *   1. validate the project name (basename only, slug-ish)
 *   2. git clone --depth 1 the main repo into ./<name>
 *   3. drop .git so the user starts with a clean history
 *   4. strip the bundled demo tours (UZME + meta-demo) so the
 *      tours/ folder is theirs to fill — only `demo-target.json`
 *      stays as a neutral starting point
 *   5. run `npm install` inside the new dir
 *   6. print next steps
 *
 * Intentionally dependency-free : ships only Node 18+ builtins so it
 * runs straight from `npx` without pulling its own tree.
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const REPO_URL = "https://github.com/ben-ndui/webgen-motion.git";
const DROP_TOURS = [
  "uzme-landing.json",
  "uzme-landing-portrait.json",
  "webgen-motion-itself.json",
];

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

function info(msg) {
  console.log(`${c.dim}  ${msg}${c.reset}`);
}

function ok(msg) {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

function die(msg) {
  console.error(`\n${c.red}✗ ${msg}${c.reset}\n`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) {
    die(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function ensureGitAvailable() {
  const r = spawnSync("git", ["--version"], { stdio: "ignore" });
  if (r.status !== 0) {
    die(
      "git is required but was not found in PATH. Install git first (e.g. `brew install git`).",
    );
  }
}

const arg = process.argv[2];
if (!arg || arg === "--help" || arg === "-h") {
  console.log(`
${c.bold}create-webgen-motion${c.reset} — scaffold a new webgen-motion project

${c.cyan}Usage${c.reset}
  npx create-webgen-motion ${c.dim}<project-name>${c.reset}

${c.cyan}Example${c.reset}
  npx create-webgen-motion my-promo

${c.cyan}What you get${c.reset}
  - a fresh clone of the webgen-motion repo (no .git)
  - tours/demo-target.json as a starting point
  - npm install already run
  - next : ${c.bold}cd <name> && npm run dev${c.reset}

${c.dim}Docs: https://github.com/ben-ndui/webgen-motion#readme${c.reset}
`);
  process.exit(arg ? 0 : 1);
}

if (!/^[A-Za-z0-9][\w.-]*$/.test(arg)) {
  die(
    `Invalid project name "${arg}". Use letters, digits, dashes, underscores; must start with a letter or digit.`,
  );
}

const target = resolve(process.cwd(), arg);
if (existsSync(target)) {
  die(`Target "${arg}" already exists. Pick a different name or remove it.`);
}

console.log(
  `\n${c.bold}▶ create-webgen-motion${c.reset} — scaffolding ${c.cyan}${arg}${c.reset}\n`,
);

ensureGitAvailable();

info("cloning template…");
run("git", ["clone", "--depth", "1", REPO_URL, target]);

// Drop the upstream history so the user starts with a clean slate.
rmSync(join(target, ".git"), { recursive: true, force: true });

// Drop the bundled demo tours that ship with the main repo for
// internal validation — they aren't useful in a downstream project.
for (const t of DROP_TOURS) {
  const p = join(target, "tours", t);
  if (existsSync(p)) rmSync(p);
}

// Drop the packages/ folder — downstream projects shouldn't carry the
// scaffolder itself.
const packagesDir = join(target, "packages");
if (existsSync(packagesDir)) rmSync(packagesDir, { recursive: true, force: true });

ok("template ready");

info("installing dependencies (this may take a minute)…");
run("npm", ["install"], { cwd: target });
ok("dependencies installed");

console.log(`
${c.green}✓ Done.${c.reset} Next steps :

  ${c.bold}cd ${arg}${c.reset}
  ${c.bold}npm run dev${c.reset}

Then :
  - open ${c.cyan}http://localhost:3000${c.reset}
  - run the ${c.bold}Setup${c.reset} wizard to add your ElevenLabs creds
  - click ${c.bold}"Nouveau tour"${c.reset} to start

${c.dim}Docs: https://github.com/ben-ndui/webgen-motion#readme${c.reset}
`);
