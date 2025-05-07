import getRawBody from "raw-body";

import { Middleware } from "../../types";

export const jsonParser: Middleware = async (req, res, next) => {
  try {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      const raw = await getRawBody(req.stream);
      req.body = JSON.parse(raw.toString());
    }
    next();
  } catch (err) {
    res.stream.respond({ ":status": 400 });
    res.stream.end("Invalid JSON");
  }
};
