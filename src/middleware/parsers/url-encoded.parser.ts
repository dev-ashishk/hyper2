import getRawBody from "raw-body";

import { Middleware } from "../../types";

export const urlencodedParser: Middleware = async (req, res, next) => {
  try {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const raw = await getRawBody(req.stream);
      const params = new URLSearchParams(raw.toString());
      req.body = Object.fromEntries(params);
    }
    next();
  } catch (err) {
    res.stream.respond({ ":status": 400 });
    res.stream.end("Invalid form body");
  }
};
