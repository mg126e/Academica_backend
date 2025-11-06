import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { exclusions, inclusions } from "./passthrough.ts";
import "jsr:@std/dotenv/load";

/**
 * # Requesting concept configuration
 * The following environment variables are available:
 *
 * - PORT: the port to the server binds, default 8000
 * - REQUESTING_BASE_URL: the base URL prefix for api requests, default "/api"
 * - REQUESTING_TIMEOUT: the timeout for requests, default 10000ms
 * - REQUESTING_SAVE_RESPONSES: whether to persist responses or not, default true
 */
const PORT = parseInt(Deno.env.get("PORT") ?? "8000", 10);
const REQUESTING_BASE_URL = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const REQUESTING_TIMEOUT = parseInt(
  Deno.env.get("REQUESTING_TIMEOUT") ?? "10000",
  10,
);

// TODO: make sure you configure this environment variable for proper CORS configuration
const REQUESTING_ALLOWED_DOMAIN = Deno.env.get("REQUESTING_ALLOWED_DOMAIN") ??
  "*";

// Choose whether or not to persist responses
const REQUESTING_SAVE_RESPONSES = Deno.env.get("REQUESTING_SAVE_RESPONSES") ??
  true;

const PREFIX = "Requesting" + ".";

// --- Type Definitions ---
type Request = ID;

/**
 * a set of Requests with
 *   an input unknown
 *   an optional response unknown
 */
interface RequestDoc {
  _id: Request;
  input: { path: string; [key: string]: unknown };
  response?: unknown;
  createdAt: Date;
}

/**
 * Represents an in-flight request waiting for a response.
 * This state is not persisted and lives only in memory.
 */
interface PendingRequest {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

/**
 * The Requesting concept encapsulates an API server, modeling incoming
 * requests and outgoing responses as concept actions.
 */
export default class RequestingConcept {
  private readonly requests: Collection<RequestDoc>;
  private readonly pending: Map<Request, PendingRequest> = new Map();
  private readonly timeout: number;

  constructor(private readonly db: Db) {
    this.requests = this.db.collection(PREFIX + "requests");
    this.timeout = REQUESTING_TIMEOUT;
    console.log(
      `\nRequesting concept initialized with a timeout of ${this.timeout}ms.`,
    );
  }

  /**
   * request (path: String, ...): (request: Request)
   * System action triggered by an external HTTP request.
   *
   * **requires** true
   *
   * **effects** creates a new Request `r`; sets the input of `r` to be the path and all other input parameters; returns `r` as `request`
   */
  async request(
    inputs: { path: string; [key: string]: unknown },
  ): Promise<{ request: Request }> {
    const requestId = freshID() as Request;
    const requestDoc: RequestDoc = {
      _id: requestId,
      input: inputs,
      createdAt: new Date(),
    };

    // Persist the request for logging/auditing purposes.
    await this.requests.insertOne(requestDoc);

    // Create an in-memory pending request to manage the async response.
    let resolve!: (value: unknown) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pending.set(requestId, { promise, resolve, reject });

    return { request: requestId };
  }

  /**
   * respond (request: Request, [key: string]: unknown)
   *
   * **requires** a Request with the given `request` id exists and has no response yet
   *
   * **effects** sets the response of the given Request to the provided key-value pairs.
   */
  async respond(
    { request, ...response }: { request: Request; [key: string]: unknown },
  ): Promise<{ request: string }> {
    console.log("[Requesting.respond] start", {
      request,
      hasError: !!response.error,
      hasSchedule: !!response.schedule,
      hasS: !!response.s,
      responseKeys: Object.keys(response),
    });
    const pendingRequest = this.pending.get(request);
    if (pendingRequest) {
      // Resolve the promise for any waiting `_awaitResponse` call.
      console.log("[Requesting.respond] resolving pending request", {
        request,
      });
      pendingRequest.resolve(response);
      console.log("[Requesting.respond] pending request resolved", { request });
    } else {
      console.log("[Requesting.respond] WARNING: no pending request found", {
        request,
      });
    }

    // Update the persisted request document with the response.
    if (REQUESTING_SAVE_RESPONSES) {
      console.log("[Requesting.respond] before DB updateOne", { request });
      await this.requests.updateOne({ _id: request }, { $set: { response } });
      console.log("[Requesting.respond] after DB updateOne", { request });
    }

    console.log("[Requesting.respond] end", { request });
    return { request };
  }

  /**
   * _awaitResponse (request: Request): (response: unknown)
   *
   * **effects** returns the response associated with the given request, waiting if necessary up to a configured timeout.
   */
  async _awaitResponse(
    { request }: { request: Request },
  ): Promise<{ response: unknown }[]> {
    console.log("[Requesting._awaitResponse] start", {
      request,
      timeout: this.timeout,
    });
    const pendingRequest = this.pending.get(request);

    if (!pendingRequest) {
      // The request might have been processed already or never existed.
      // We could check the database for a persisted response here if needed.
      console.log("[Requesting._awaitResponse] ERROR: no pending request", {
        request,
      });
      throw new Error(
        `Request ${request} is not pending or does not exist: it may have timed-out.`,
      );
    }

    console.log("[Requesting._awaitResponse] waiting for response or timeout", {
      request,
    });
    let timeoutId: number;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => {
          console.log("[Requesting._awaitResponse] TIMEOUT", {
            request,
            timeout: this.timeout,
          });
          reject(
            new Error(`Request ${request} timed out after ${this.timeout}ms`),
          );
        },
        this.timeout,
      );
    });

    try {
      // Race the actual response promise against the timeout.
      const response = await Promise.race([
        pendingRequest.promise,
        timeoutPromise,
      ]);
      console.log("[Requesting._awaitResponse] received response", {
        request,
        hasError: !!(response as Record<string, unknown>)?.error,
      });
      return [{ response }];
    } finally {
      // Clean up regardless of outcome.
      clearTimeout(timeoutId!);
      this.pending.delete(request);
      console.log("[Requesting._awaitResponse] cleanup done", { request });
    }
  }
}

/**
 * Starts the Hono web server that listens for incoming requests and pipes them
 * into the Requesting concept instance. Additionally, it allows passthrough
 * requests to concept actions by default. These should be
 * @param concepts The complete instantiated concepts import from "@concepts"
 */
export async function startRequestingServer(
  // deno-lint-ignore no-explicit-any
  concepts: Record<string, any>,
) {
  // deno-lint-ignore no-unused-vars
  const { Requesting, client, db, Engine, ...instances } = concepts;
  if (!(Requesting instanceof RequestingConcept)) {
    throw new Error("Requesting concept missing or broken.");
  }
  const app = new Hono();
  // Configure CORS to allow requests from frontend
  // This handles both simple and preflight (OPTIONS) requests
  // Note: When using credentials: true, origin cannot be "*", so we need a function
  const corsConfig: Parameters<typeof cors>[0] =
    REQUESTING_ALLOWED_DOMAIN === "*"
      ? {
        origin: "*",
        credentials: false,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Session-ID",
          "Accept",
          "Origin",
          "X-Requested-With",
        ],
        exposeHeaders: [
          "Content-Type",
          "Content-Length",
          "ETag",
        ],
        maxAge: 86400, // 24 hours
      }
      : {
        origin: (origin) => {
          // Support comma-separated list of allowed origins
          const allowed = REQUESTING_ALLOWED_DOMAIN.split(",").map((s) =>
            s.trim()
          );
          // If origin is provided and in allowed list, return it
          if (origin && allowed.includes(origin)) {
            return origin;
          }
          // Otherwise return the first allowed origin
          return allowed[0] || "*";
        },
        credentials: true,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Session-ID",
          "Accept",
          "Origin",
          "X-Requested-With",
        ],
        exposeHeaders: [
          "Content-Type",
          "Content-Length",
          "ETag",
        ],
        maxAge: 86400, // 24 hours
      };

  console.log(
    `[CORS] Configuration: origin=${
      REQUESTING_ALLOWED_DOMAIN === "*" ? "*" : "custom"
    }, credentials=${REQUESTING_ALLOWED_DOMAIN !== "*"}`,
  );

  // Apply CORS middleware to all routes
  // This must be applied before any route handlers
  app.use("/*", cors(corsConfig));

  // Additional explicit CORS handler for OPTIONS requests (fallback)
  // This ensures preflight requests always get proper CORS headers
  app.options("*", async (c) => {
    const origin = c.req.header("Origin");
    const corsOrigin = REQUESTING_ALLOWED_DOMAIN === "*"
      ? "*"
      : REQUESTING_ALLOWED_DOMAIN.split(",").map((s) => s.trim()).includes(
          origin || "",
        )
      ? origin
      : REQUESTING_ALLOWED_DOMAIN.split(",")[0] || "*";

    c.header("Access-Control-Allow-Origin", corsOrigin);
    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    c.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Session-ID, Accept, Origin, X-Requested-With",
    );
    c.header("Access-Control-Max-Age", "86400");
    if (REQUESTING_ALLOWED_DOMAIN !== "*") {
      c.header("Access-Control-Allow-Credentials", "true");
    }
    return c.text("", 204);
  });

  /**
   * PASSTHROUGH ROUTES
   *
   * These routes register against every concept action and query.
   * While convenient, you should confirm that they are either intentional
   * inclusions and specify a reason, or if they should be excluded and
   * handled by Requesting instead.
   */

  console.log("\nRegistering concept passthrough routes.");
  let unverified = false;
  for (const [conceptName, concept] of Object.entries(instances)) {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(concept),
    )
      .filter((name) =>
        name !== "constructor" && typeof concept[name] === "function"
      );
    for (const method of methods) {
      const route = `${REQUESTING_BASE_URL}/${conceptName}/${method}`;
      if (exclusions.includes(route)) continue;
      const included = route in inclusions;
      if (!included) unverified = true;
      const msg = included
        ? `  -> ${route}`
        : `WARNING - UNVERIFIED ROUTE: ${route}`;

      app.post(route, async (c) => {
        try {
          const body = await c.req.json().catch(() => ({})); // Handle empty body
          const result = await concept[method](body);
          return c.json(result);
        } catch (e) {
          console.error(`Error in ${conceptName}.${method}:`, e);
          return c.json({ error: "An internal server error occurred." }, 500);
        }
      });
      console.log(msg);
    }
  }
  const passthroughFile = "./src/concepts/Requesting/passthrough.ts";
  if (unverified) {
    console.log(`FIX: Please verify routes in: ${passthroughFile}`);
  }

  /**
   * REQUESTING ROUTES
   *
   * Captures all POST routes under the base URL.
   * The specific action path is extracted from the URL.
   */

  const routePath = `${REQUESTING_BASE_URL}/*`;
  app.post(routePath, async (c) => {
    const startTime = Date.now();
    try {
      console.log("[Requesting] POST route handler start", {
        path: c.req.path,
      });
      const body = await c.req.json();
      console.log("[Requesting] POST route handler body parsed", {
        path: c.req.path,
      });
      if (typeof body !== "object" || body === null) {
        console.log("[Requesting] POST route handler invalid body");
        return c.json(
          { error: "Invalid request body. Must be a JSON object." },
          400,
        );
      }

      // Extract the specific action path from the request URL.
      // e.g., if base is /api and request is /api/users/create, path is /users/create
      const actionPath = c.req.path.substring(REQUESTING_BASE_URL.length);

      // Extract session from headers (X-Session-ID or Authorization header)
      const sessionId = c.req.header("X-Session-ID") ||
        c.req.header("Authorization")?.replace("Bearer ", "") ||
        null;

      // Combine the path from the URL with the JSON body to form the action's input.
      // Include session if available from headers
      const inputs = {
        ...body,
        path: actionPath,
        ...(sessionId ? { session: sessionId } : {}),
      };

      // Log session extraction (but not the actual session ID for security)
      if (sessionId) {
        console.log("[Requesting] Session extracted from headers", {
          hasSession: true,
          headerUsed: c.req.header("X-Session-ID")
            ? "X-Session-ID"
            : "Authorization",
        });
      } else {
        console.log("[Requesting] No session found in headers");
      }

      // Log request path only (never log credentials or sensitive data)
      console.log(`[Requesting] Received request for path: ${actionPath}`);

      // 1. Trigger the 'request' action.
      console.log("[Requesting] POST route handler before request() call");
      const { request } = await Requesting.request(inputs);
      console.log("[Requesting] POST route handler after request() call", {
        request,
      });

      // 2. Await the response via the query. This is where the server waits for
      //    synchronizations to trigger the 'respond' action.
      console.log(
        "[Requesting] POST route handler before _awaitResponse() call",
        { request },
      );
      const responseArray = await Requesting._awaitResponse({ request });
      console.log(
        "[Requesting] POST route handler after _awaitResponse() call",
        { request, hasResponse: !!responseArray[0]?.response },
      );

      // 3. Send the response back to the client.
      const { response } = responseArray[0];
      const elapsed = Date.now() - startTime;
      console.log("[Requesting] POST route handler sending response", {
        request,
        actionPath,
        elapsed: `${elapsed}ms`,
        hasResponse: !!response,
        responseKeys: response && typeof response === "object"
          ? Object.keys(response)
          : null,
        hasError: !!(response as Record<string, unknown>)?.error,
        hasSchedule: !!(response as Record<string, unknown>)?.s,
      });

      // Special handling for getAllSchedules: return array directly per API spec
      if (
        actionPath === "/CourseScheduling/getAllSchedules" &&
        response &&
        typeof response === "object" &&
        "schedules" in response &&
        Array.isArray(response.schedules)
      ) {
        return c.json(response.schedules);
      }

      // Special handling for getSchedulesByOwner: return array directly per API spec
      if (
        actionPath === "/CourseScheduling/getSchedulesByOwner" &&
        response &&
        typeof response === "object" &&
        "schedules" in response &&
        Array.isArray(response.schedules)
      ) {
        return c.json(response.schedules);
      }

      // Special handling for getSchedule: return array directly (getSchedule returns Schedule[] | null)
      if (
        actionPath === "/CourseScheduling/getSchedule" &&
        response &&
        typeof response === "object" &&
        "schedules" in response &&
        Array.isArray(response.schedules)
      ) {
        // Return the first schedule if array has one element, or null if empty
        return c.json(
          response.schedules.length > 0 ? response.schedules[0] : null,
        );
      }

      // Special handling for suggestAlternatives: return array directly per API spec
      if (
        actionPath === "/CourseFiltering/suggestAlternatives" &&
        response &&
        typeof response === "object" &&
        "suggestions" in response &&
        Array.isArray(response.suggestions)
      ) {
        return c.json(response.suggestions);
      }

      return c.json(response);
    } catch (e) {
      const elapsed = Date.now() - startTime;
      if (e instanceof Error) {
        console.error(
          `[Requesting] Error processing request (${elapsed}ms):`,
          e.message,
        );
        if (e.message.includes("timed out")) {
          return c.json({ error: "Request timed out." }, 504); // Gateway Timeout
        }
        return c.json({ error: "An internal server error occurred." }, 500);
      } else {
        console.error(`[Requesting] Unknown error (${elapsed}ms):`, e);
        return c.json({ error: "unknown error occurred." }, 418);
      }
    }
  });

  /**
   * ROOT ROUTE - Health check endpoint
   * Provides a simple health check for Render and other monitoring tools
   */
  app.get("/", (c) => {
    return c.json({
      status: "ok",
      message: "Academica Backend API is running",
      baseUrl: REQUESTING_BASE_URL,
    });
  });

  /**
   * HEALTH CHECK ENDPOINT
   * Required for Render deployment health checks
   */
  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  console.log(
    `\n🚀 Requesting server listening for POST requests at base path of ${routePath}`,
  );
  console.log(`📡 Server will bind to 0.0.0.0:${PORT}`);
  console.log(`🌐 Listening on http://0.0.0.0:${PORT}`);

  const server = Deno.serve(
    { port: PORT, hostname: "0.0.0.0" },
    app.fetch,
  );

  await server.finished;
}
