import { Logger } from "@/utils/logger";

import { IContext, Method, Middleware, Route } from "../../types";
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

  constructor() {
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
    this.logger.info(`Mapped {${path} ${method}} route`);
    // Convert from Context to IContext for internal storage
    const wrappedHandler = (ctx: IContext) =>
      handler(ctx as unknown as Context);
    this.routes.push({ method, path, handler: wrappedHandler, metadata });
    return this;
  }

  private match(
    method: string,
    url: string
  ): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const matched = this.matchRoute(route.path, url);
      if (matched && route.method === method.toUpperCase()) {
        return { route, params: matched };
      }
    }
    return null;
  }

  private matchRoute(
    routePath: string,
    url: string
  ): Record<string, string> | null {
    const pathParts = routePath.split("/");
    const urlParts = url.split("/");
    if (pathParts.length !== urlParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < pathParts.length; i++) {
      const pathPart = pathParts[i];
      const urlPart = urlParts[i];
      if (pathPart.startsWith(":")) {
        const paramName = pathPart.slice(1);
        params[paramName] = urlPart;
      } else if (pathPart !== urlPart) {
        return null;
      }
    }
    return params;
  }

  handler() {
    return async (ctx: Context) => {
      // Apply middlewares
      for (const middleware of this.middlewares) {
        await new Promise<void>((resolve, reject) => {
          middleware(ctx.req, ctx.res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Match route and execute the handler
      const match = this.match(ctx.req.method, ctx.req.url);
      if (match) {
        const { route, params } = match;
        ctx.params = params;
        ctx.routeMetadata = route.metadata;
        await route.handler(ctx);
      } else {
        ctx.send({ error: "Not Found" }, 404);
      }
    };
  }

  group(prefix: string, callback: () => void) {
    const previousRoutes = [...this.routes];
    this.routes = [];

    callback();

    this.routes = this.routes.map((route) => ({
      ...route,
      path: prefix + route.path,
    }));

    this.routes = [...previousRoutes, ...this.routes];
  }
}
