import { Middleware } from "@/types";
import { Logger } from "@/utils/logger";

import { Router } from "../router";
import { createServer } from "../server";

export class Http2App {
  public router: Router;
  private middlewareList: Middleware[] = [];
  private certOptions: { cert?: string; key?: string } = {};
  public app = this;
  logger: typeof Logger | Logger;

  constructor(appName?: string) {
    this.app = this;
    this.logger = appName ? new Logger(appName) : Logger;
    this.router = new Router();
  }

  use(middleware: Middleware) {
    this.middlewareList.push(middleware);
  }
  cert(certOptions: { cert?: string; key?: string }) {
    this.certOptions = certOptions;
  }
  listen(port: number, callback?: () => void) {
    try {
      const server = createServer(
        this.router.handler(),
        this.middlewareList,
        this.certOptions
      );
      server.listen(port);
      if (callback) {
        callback();
      } else {
        this.logger.success(`Server running at https://localhost:${port}`);
      }
    } catch (error) {
      this.logger.error("Failed to start server", error);
    }
  }
}
