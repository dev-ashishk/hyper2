import { ServerHttp2Stream } from "http2";

import { Http2Request, Http2Response } from "../../types";

export class Context {
  req: Http2Request;
  res: Http2Response;
  method: string;
  url: string;
  stream: ServerHttp2Stream;
  params: Record<string, string> = {};
  routeMetadata: Record<string, any> = {};

  constructor(req: any, res: any) {
    this.req = req;
    this.res = res;
    this.method = req.method;
    this.url = req.url;
    this.stream = res.stream || res;
  }

  send(data: any, statusCode = 200, headers: Record<string, string> = {}) {
    // Update the response status and headers
    this.res.status = statusCode;
    this.res.headers = { ...this.res.headers, ...headers };

    // Send the response
    this.stream.respond({
      ":status": statusCode,
      "content-type": "application/json",
      ...headers,
    });

    const body = typeof data === "string" ? data : JSON.stringify(data);
    this.stream.end(body);

    this.res.headersSent = true;
  }

  streamFile(
    readableStream: NodeJS.ReadableStream,
    headers: Record<string, string> = {}
  ) {
    // Update the response headers
    this.res.headers = { ...this.res.headers, ...headers };

    // Send the headers
    this.stream.respond({
      ":status": 200,
      ...headers,
    });

    // Stream the file
    readableStream.pipe(this.stream);

    // Mark response as being handled (though it may not be fully sent yet)
    this.res.headersSent = true;
  }
}
