/**
 * Data-branch helper for workflows:
 *   tsx jobs/data.ts checkout            attach the `data` branch at DATA_DIR (CI)
 *   tsx jobs/data.ts publish "<message>" squash + force-push DATA_DIR to the `data` branch (CI, DATA_PUSH=1)
 */
import { checkoutDataBranch, publishDataBranch } from "./lib/data-store";

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "checkout") checkoutDataBranch();
else if (cmd === "publish") publishDataBranch(rest.join(" ") || `data update ${new Date().toISOString()}`);
else {
  console.error("usage: tsx jobs/data.ts checkout | publish <message>");
  process.exit(2);
}
