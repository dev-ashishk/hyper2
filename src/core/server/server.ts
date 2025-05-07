import fs from "fs";
import http2, { IncomingHttpHeaders } from "http2";
import path from "path";

import { Logger } from "@/utils/logger";

import { Http2Request, Http2Response, Method, Middleware } from "../../types";
import { Context } from "../context/context";

export function createServer(
  app: (router: Context) => Promise<void>,
  middlewareList: Middleware[] = [],
  certOptions: { cert?: string; key?: string } = {}
) {
  Logger.info("Starting server...");
  const defaultCertPath = path.resolve(
    __dirname,
    "../../../certs/localhost.pem"
  );
  const defaultKeyPath = path.resolve(
    __dirname,
    "../../../certs/localhost-key.pem"
  );

  const certPath = certOptions.cert || defaultCertPath;
  const keyPath = certOptions.key || defaultKeyPath;

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(
      "Certificate or key file missing. Please provide valid cert/key."
    );
  }

  const server = http2.createSecureServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  });

  server.on("stream", (stream, headers: IncomingHttpHeaders) => {
    // Validate the method
    const methodName = headers[":method"] || "GET";
    const validMethods: Method[] = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
      "CONNECT",
      "TRACE",
    ];
    const method = validMethods.includes(methodName as Method)
      ? (methodName as Method)
      : "GET";

    // Create request and response objects with proper initialization
    const req: Http2Request = {
      headers,
      method: method,
      url: headers[":path"] || "/",
      stream,
      body: {},
      files: {},
    };

    const res: Http2Response = {
      headers: {},
      status: 200,
      stream,
      headersSent: false,
    };

    const ctx = new Context(req, res);

    (async () => {
      try {
        // Process all middleware sequentially
        for (const middleware of middlewareList) {
          await new Promise<void>((resolve, reject) => {
            middleware(ctx.req, ctx.res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // Execute the main application handler
        await app(ctx);

        // If no response was sent, send a default 204 No Content
        if (!ctx.res.headersSent) {
          stream.respond({ ":status": 204 });
          stream.end();
        }
      } catch (err: any) {
        // Handle any errors that occurred during middleware execution or in the app handler
        if (!ctx.res.headersSent) {
          stream.respond({ ":status": 500 });
          stream.end(`Internal Server Error\n\n${err.message}`);
        }
      }
    })();
  });

  return server;
}
