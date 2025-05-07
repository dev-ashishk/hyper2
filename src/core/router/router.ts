import { Logger } from "@/utils/logger";

import { Method, Middleware, Route } from "../../types";
import { Context } from "../context/context";

export const methods = [
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

export class Router {
  private routes: Route[] = [];
  private middlewares: Middleware[] = [];
  logger: Logger;

  constructor(logger?: Logger) {
    methods.forEach((method) => {
      (this as any)[method.toLowerCase()] = (
        path: string,
        handler: (ctx: Context) => any,
        metadata: Record<string, any> = {}
      ) => {
        this.register(method as Method, path, handler, metadata);
        return this;
      };
    });
    this.logger = new Logger(Router.name);
  }

  // Explicitly define HTTP method functions for TypeScript
  get(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("GET", path, handler, metadata);
  }

  post(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("POST", path, handler, metadata);
  }

  put(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("PUT", path, handler, metadata);
  }

  delete(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("DELETE", path, handler, metadata);
  }

  patch(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("PATCH", path, handler, metadata);
  }

  head(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("HEAD", path, handler, metadata);
  }

  options(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("OPTIONS", path, handler, metadata);
  }

  connect(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("CONNECT", path, handler, metadata);
  }

  trace(
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any> = {}
  ): this {
    return this.register("TRACE", path, handler, metadata);
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  private register(
    method: Method,
    path: string,
    handler: (ctx: Context) => any,
    metadata: Record<string, any>
  ): this {
    const [pattern, params] = this.createPattern(path);
    this.routes.push({ method, pattern, handler, params, metadata });
    this.logger.info(`Mapped {${method} ${path}} route`);
    return this;
  }

  private createPattern(path: string): [RegExp, string[]] {
    // Convert route path into a regular expression pattern
    const params: string[] = [];
    const pattern = path
      .replace(/:\w+/g, (match) => {
        params.push(match.slice(1)); // Store the parameter name without ":"
        return "([^/]+)"; // Match any characters except '/'
      })
      .replace(/\*/g, "(.*)"); // Match everything after the wildcard *

    return [new RegExp(`^${pattern}$`), params];
  }

  private match(
    method: string,
    url: string
  ): { route: any; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method === method.toUpperCase()) {
        const match = url.match(route.pattern);
        if (match) {
          const params: Record<string, string> = {};
          route.params.forEach((param, index) => {
            params[param] = match[index + 1]; // Get the matched param value
          });
          return { route, params };
        }
      }
    }
    return null;
  }

  handler() {
    return async (ctx: Context) => {
      try {
        // Execute middlewares in sequence and handle errors within them
        for (const middleware of this.middlewares) {
          await new Promise<void>((resolve, reject) => {
            middleware(ctx.req, ctx.res, (err?: any) =>
              err ? reject(err) : resolve()
            );
          });
        }

        // Match route and handle it
        const match = this.match(ctx.req.method, ctx.req.url);
        if (match) {
          const { route, params } = match;
          ctx.params = params;
          ctx.routeMetadata = route.metadata;
          await route.handler(ctx);
        } else {
          ctx.send({ error: "Not Found" }, 404);
        }
      } catch (err: any) {
        // Centralized error handling
        if (!ctx.res.headersSent) {
          ctx.send(
            { error: "Internal Server Error", message: err.message },
            500
          );
        }
      }
    };
  }

  group(prefix: string, callback: () => void) {
    const previousRoutes = [...this.routes];
    this.routes = [];
    callback();

    this.routes = this.routes.map((route) => ({
      ...route,
      pattern: new RegExp(`^${prefix}${route.pattern.source}$`), // Apply prefix to all routes
    }));

    this.routes = [...previousRoutes, ...this.routes];
  }
}
