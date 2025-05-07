import fs from "fs";
import path from "path";

import { Context } from "../../src/core/context/context";
import { Router } from "../../src/core/router/router";
import { createServer } from "../../src/core/server/server";
import { multipartParser } from "../../src/middleware/parsers/multipart.parser";

// Create a router
const router = new Router();

// Register multipart form data parser
router.use(multipartParser);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple HTML form for file upload
const uploadForm = `
<!DOCTYPE html>
<html>
<head>
  <title>Hyper2 File Upload Example</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    form {
      background: #f9f9f9;
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 5px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input[type="text"], input[type="file"] {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #45a049;
    }
    pre {
      background: #f4f4f4;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 10px;
      overflow: auto;
    }
  </style>
</head>
<body>
  <h1>Hyper2 File Upload Example</h1>
  
  <form action="/upload" method="post" enctype="multipart/form-data">
    <div class="form-group">
      <label for="name">Your Name:</label>
      <input type="text" id="name" name="name" required>
    </div>
    
    <div class="form-group">
      <label for="file">Select File:</label>
      <input type="file" id="file" name="file" required>
    </div>
    
    <button type="submit">Upload File</button>
  </form>
  
  <h2>Upload API Usage:</h2>
  <pre>
  # Using curl to upload a file
  curl -k -X POST https://localhost:3000/upload \\
       -F "name=John" \\
       -F "file=@/path/to/yourfile.jpg"
  </pre>
</body>
</html>
`;

// Define routes
router.get("/", async (ctx: Context) => {
  ctx.stream.respond({
    ":status": 200,
    "content-type": "text/html; charset=utf-8",
  });
  ctx.stream.end(uploadForm);
  ctx.res.headersSent = true;
});

router.post("/upload", async (ctx: Context) => {
  const { name } = ctx.req.body;
  const file = ctx.req.files?.file;

  if (!file) {
    return ctx.send({ error: "No file uploaded" }, 400);
  }

  if (Array.isArray(file)) {
    // Handle multiple files with the same field name
    return ctx.send(
      { error: "Multiple files not supported in this example" },
      400
    );
  }

  // Move file to uploads directory with original filename
  const newPath = path.join(
    uploadsDir,
    file.originalFilename || "unknown-file"
  );

  try {
    // Create a read stream from the temporary file
    const readStream = fs.createReadStream(file.filepath);
    // Create a write stream to the new location
    const writeStream = fs.createWriteStream(newPath);

    // Pipe the read stream to the write stream
    readStream.pipe(writeStream);

    // Wait for the file to be written
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Success response
    ctx.send(
      {
        message: "File uploaded successfully",
        fileName: file.originalFilename,
        submittedBy: name,
        size: file.size,
        type: file.mimetype,
        savedTo: newPath,
      },
      201
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    ctx.send({ error: "Failed to save uploaded file" }, 500);
  }
});

// Create server with the router handler
const server = createServer(router.handler());

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`File Upload server running at https://localhost:${PORT}`);
});
