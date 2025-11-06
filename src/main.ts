/**
 * Entry point for an application built with concepts + synchronizations.
 * Requires the Requesting concept as a bootstrap concept.
 * Please run "deno run import" or "generate_imports.ts" to prepare "@concepts".
 */
import * as concepts from "@concepts";

// Use the following line instead to run against the test database, which resets each time.
// import * as concepts from "@test-concepts";

const { Engine, db } = concepts;
import { Logging } from "@engine";
import { startRequestingServer } from "@concepts/Requesting/RequestingConcept.ts";
import { ensureIndexes } from "@utils/database.ts";
import syncs from "@syncs";

/**
 * Available logging levels:
 *   Logging.OFF
 *   Logging.TRACE - display a trace of the actions.
 *   Logging.VERBOSE - display full record of synchronization.
 */
Engine.logging = Logging.TRACE;

// Verify database connection before proceeding
console.log("Verifying database connection...");
try {
  await db.admin().ping();
  console.log("✓ Database connection verified");
} catch (error) {
  console.error("✗ Database connection failed:", error);
  console.error(
    "Please check your MONGODB_URL and DB_NAME environment variables",
  );
  Deno.exit(1);
}

// Ensure database indexes are created for optimal query performance
await ensureIndexes(db);

// Register synchronizations
Engine.register(syncs);

// Start a server to provide the Requesting concept with external/system actions.
await startRequestingServer(concepts);
