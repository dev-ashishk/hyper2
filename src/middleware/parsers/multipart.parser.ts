import formidable from "formidable";

import { Middleware } from "../../types";

export const multipartParser: Middleware = async (req, res, next) => {
  try {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      const form = formidable({ multiples: true });

      form.parse(req.stream as any, (err, fields, files) => {
        if (err) {
          res.stream.respond({ ":status": 400 });
          res.stream.end("Error parsing form");
          return;
        }

        req.body = fields;
        req.files = files;
        next();
      });
    } else {
      next();
    }
  } catch (err) {
    res.stream.respond({ ":status": 500 });
    res.stream.end("Form parsing error");
  }
};
