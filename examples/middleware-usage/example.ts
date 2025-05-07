import { Context } from "../../src/core/context/context";
import { Router } from "../../src/core/router/router";
import { createServer } from "../../src/core/server/server";
import { jsonParser } from "../../src/middleware/parsers/json.parser";
import { Http2Request, Http2Response, Middleware } from "../../src/types";

// Create a router
const router = new Router();

// 1. Logger Middleware
const loggerMiddleware: Middleware = (
  req: Http2Request,
  res: Http2Response,
  next: (err?: any) => void
) => {
  const start = Date.now();
  const { method, url } = req;

  console.log(
    `[${new Date().toISOString()}] ${method} ${url} - Request received`
  );

  // Override the stream.respond method to capture the response status
  const originalRespond = res.stream.respond;
  res.stream.respond = function (headers, options) {
    const status = headers?.[":status"] || 200;
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} - Response: ${status} (${duration}ms)`
    );
    return originalRespond.call(this, headers, options);
  };

  next();
};

// 2. API Key Authentication Middleware
const API_KEYS = ["sk_test_123456", "sk_test_abcdef"];

const authMiddleware: Middleware = (
  req: Http2Request,
  res: Http2Response,
  next: (err?: any) => void
) => {
  // Skip auth for non-protected routes
  if (req.url === "/" || req.url === "/public") {
    return next();
  }

  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey || !API_KEYS.includes(apiKey)) {
    res.stream.respond({ ":status": 401 });
    res.stream.end(
      JSON.stringify({ error: "Unauthorized - Invalid or missing API key" })
    );
    res.headersSent = true;
    return;
  }

  next();
};

// 3. Error Handling Middleware
const errorHandlerMiddleware: Middleware = (
  req: Http2Request,
  res: Http2Response,
  next: (err?: any) => void
) => {
  try {
    next();
  } catch (error: any) {
    console.error("Unhandled error:", error);

    if (!res.headersSent) {
      res.stream.respond({ ":status": 500 });
      res.stream.end(
        JSON.stringify({
          error: "Internal Server Error",
          message: error.message || "An unexpected error occurred",
        })
      );
      res.headersSent = true;
    }
  }
};

// Register middlewares
router.use(errorHandlerMiddleware); // Error handler should be first to catch errors in other middleware
router.use(loggerMiddleware);
router.use(authMiddleware);
router.use(jsonParser);

// Define routes
router.get("/", async (ctx: Context) => {
  ctx.send(
    {
      message: "Welcome to the Middleware Example",
      endpoints: [
        {
          path: "/public",
          description: "Public endpoint - no authentication required",
        },
        {
          path: "/private",
          description: "Private endpoint - requires valid API key",
        },
        {
          path: "/error",
          description: "Endpoint that demonstrates error handling",
        },
      ],
    },
    200
  );
});

router.get("/public", async (ctx: Context) => {
  ctx.send(
    {
      message: "This is a public endpoint",
      timestamp: new Date().toISOString(),
    },
    200
  );
});

router.get("/private", async (ctx: Context) => {
  // Authentication is handled by middleware
  ctx.send(
    {
      message:
        "This is a private endpoint - you have successfully authenticated!",
      timestamp: new Date().toISOString(),
    },
    200
  );
});

router.post("/private/data", async (ctx: Context) => {
  // Body is parsed by jsonParser middleware
  const { data } = ctx.req.body || {};

  if (!data) {
    ctx.send({ error: "No data provided" }, 400);
    return;
  }

  ctx.send(
    {
      message: "Data received successfully",
      receivedData: data,
      timestamp: new Date().toISOString(),
    },
    200
  );
});

router.get("/error", async (ctx: Context) => {
  // This will be caught by our error handler middleware
  throw new Error("This is a test error thrown by the endpoint");
});

// Create server with the router handler
const server = createServer(router.handler());

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Middleware Example server running at https://localhost:${PORT}`);
  console.log("\nTo access protected endpoints, include an x-api-key header:");
  console.log("  Valid API keys: sk_test_123456, sk_test_abcdef");
});
