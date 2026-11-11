import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const meta = {
  sha: git(["rev-parse", "--short", "HEAD"]) || "unknown",
  committed: git(["log", "-1", "--format=%cI"]),
  built: new Date().toISOString(),
};

const file = join(process.cwd(), "src/lib/buildMeta.generated.ts");
writeFileSync(
  file,
  `// Written by scripts/write-build-meta.mjs. Baked into the server build. Do not edit.\nexport const buildMeta = ${JSON.stringify(meta, null, 2)} as const;\n`,
);
