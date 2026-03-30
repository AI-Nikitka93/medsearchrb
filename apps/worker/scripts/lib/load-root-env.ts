import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type EnvMap = Record<string, string>;

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const delimiter = line.indexOf("=");
        return [
          line.slice(0, delimiter).trim(),
          line.slice(delimiter + 1).trim().replace(/^"|"$/gu, ""),
        ];
      }),
  );
}

export function loadRootEnvFiles(importMetaUrl: string): EnvMap {
  const scriptDir = path.dirname(fileURLToPath(importMetaUrl));
  const root = path.resolve(scriptDir, "../../..");

  const merged = {
    ...parseEnvFile(path.join(root, ".env.txt")),
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.local")),
  };

  return merged;
}
