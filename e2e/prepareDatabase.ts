import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));

function run(command: string) {
  execSync(command, { cwd: workspaceRoot, stdio: "inherit" });
}

export default function prepareDatabase() {
  run("pnpm --filter api db:remove-test-accounts");
  run("pnpm --filter api db:seed");
}
