/**
 * Trader Worker entrypoint.
 * Implements graceful shutdown for SIGINT/SIGTERM (V1-STARTUP-SHUTDOWN).
 */
import { loadConfig } from "@deriv-trader/config";
import { startTraderService } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const service = await startTraderService({ config, logger: true });
  // eslint-disable-next-line no-console -- CLI startup log (not trading path)
  console.log(
    `[trader] ready on ${config.traderHost}:${String(config.traderPort)} env=${config.environment} build=${config.buildSha}`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console -- CLI shutdown log
    console.log(`[trader] received ${signal}; stopping new admissions and flushing`);
    try {
      await service.close();
    } finally {
      // eslint-disable-next-line no-console -- CLI shutdown log
      console.log("[trader] stopped");
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

const isDirectRun =
  process.argv[1]?.endsWith("index.js") === true ||
  process.argv[1]?.endsWith("index.ts") === true;

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error("[trader] fatal startup error", error);
    process.exit(1);
  });
}
