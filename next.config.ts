import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const root = path.dirname(fileURLToPath(import.meta.url));

// One id per build. A tab opened on an older build gets a full page load on its next
// navigation instead of reusing stale prefetched data. `next build` makes the id
// (NEXT_DEPLOYMENT_ID, else the git commit plus build time) and saves it to
// .deployment-id; `next start` reads that file so both use the same id.
const DEPLOYMENT_ID_FILE = path.join(root, ".deployment-id");

function makeDeploymentId(): string {
  if (process.env.NEXT_DEPLOYMENT_ID) return process.env.NEXT_DEPLOYMENT_ID;
  let commit = "";
  try {
    commit = execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    // No git on the server: the build time alone is enough.
  }
  return [commit, Date.now().toString(36)].filter(Boolean).join("-");
}

function deploymentId(phase: string): string | undefined {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const id = makeDeploymentId();
    fs.writeFileSync(DEPLOYMENT_ID_FILE, id);
    return id;
  }
  if (phase !== PHASE_PRODUCTION_SERVER) return undefined; // next dev needs no id
  if (process.env.NEXT_DEPLOYMENT_ID) return process.env.NEXT_DEPLOYMENT_ID;
  try {
    return fs.readFileSync(DEPLOYMENT_ID_FILE, "utf8").trim() || undefined;
  } catch {
    return undefined; // never built
  }
}

export default function config(phase: string): NextConfig {
  return {
    deploymentId: deploymentId(phase),
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
      root,
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}

// Lets `next dev` talk to local Cloudflare bindings when previewing Workers.
initOpenNextCloudflareForDev();
