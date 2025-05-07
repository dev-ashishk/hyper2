import { IncomingHttpHeaders, ServerHttp2Stream } from "http2";

export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "CONNECT"
  | "TRACE";

export interface Http2Request {
  headers: IncomingHttpHeaders;
  method: Method;
  url: string;
  stream: ServerHttp2Stream;
  body?: any;
  files?: any;
}

export interface Http2Response {
  headers: Record<string, string>;
  status: number;
  stream: ServerHttp2Stream;
  headersSent?: boolean;
}

export interface IContext {
  req: Http2Request;
  res: Http2Response;
}

export interface Route {
  method: Method;
  pattern: string | RegExp;
  handler: (ctx: IContext) => any | Promise<any>;
  metadata: Record<string, any>;
  params: string[];
}

export type Middleware = (
  req: Http2Request,
  res: Http2Response,
  next: (err?: any) => void
) => void | Promise<void>;

export type Handler = (ctx: IContext) => void | Promise<void>;
