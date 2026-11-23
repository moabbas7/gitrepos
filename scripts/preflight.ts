/**
 * Pre-flight checks for CI (and local use):
 *   tsx scripts/preflight.ts            # jobs: secrets, D1 reachable, migrations applied
 *   tsx scripts/preflight.ts --deploy   # + wrangler binding matches, token can access Workers
 * Prints GitHub annotations + a step summary; exits 1 on any error.
 */
import { appendFileSync } from "node:fs";
import { checkCloudflareEnv, checkRemote, checkWranglerBinding, readWranglerConfig, type Issue } from "../jobs/lib/preflight";

async function main() {
  const deploy = process.argv.includes("--deploy");
  const env = process.env;
  const { issues, mode } = checkCloudflareEnv(env);

  if (mode === "remote" && !issues.some((i) => i.level === "error")) {
    issues.push(...checkWranglerBinding(readWranglerConfig(), env.D1_DATABASE_ID ?? ""));
    issues.push(
      ...(await checkRemote({
        accountId: env.CLOUDFLARE_ACCOUNT_ID!,
        apiToken: env.CLOUDFLARE_API_TOKEN!,
        databaseId: env.D1_DATABASE_ID!,
        deploy,
        githubToken: env.GITHUB_TOKEN,
      })),
    );
  }

  report(issues, mode, deploy);
  process.exitCode = issues.some((i) => i.level === "error") ? 1 : 0;
}

function report(issues: Issue[], mode: string, deploy: boolean) {
  const inCI = !!process.env.GITHUB_ACTIONS;
  const icon = { error: "❌", warning: "⚠️", notice: "ℹ️" } as const;
  console.log(`[preflight] mode=${mode}${deploy ? " +deploy" : ""}`);
  if (!issues.length) console.log("[preflight] all checks passed ✅");
  for (const i of issues) {
    if (inCI) console.log(`::${i.level} title=Preflight: ${i.check}::${i.message}`);
    else console.log(`${icon[i.level]} [${i.check}] ${i.message}`);
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const rows = issues.length
      ? issues.map((i) => `| ${icon[i.level]} | ${i.check} | ${i.message.replace(/\|/g, "\\|")} |`).join("\n")
      : "| ✅ | all | All checks passed |";
    appendFileSync(summary, `### Pre-flight (${mode}${deploy ? ", deploy" : ""})\n\n| | Check | Result |\n|---|---|---|\n${rows}\n\n`);
  }
}

main().catch((e) => {
  console.error(`::error title=Preflight crashed::${(e as Error).message}`);
  process.exitCode = 1;
});
