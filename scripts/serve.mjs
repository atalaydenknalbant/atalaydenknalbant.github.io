import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
const portArgument = args.indexOf("--port");
let port = Number(portArgument >= 0 ? args[portArgument + 1] : 8000);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid port");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (
      pathname
        .split("/")
        .some((part) => part.startsWith(".") || part === "node_modules")
    ) {
      response.writeHead(403).end();
      return;
    }
    const file = await realpath(
      resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`),
    );
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && port < 65535) {
    server.listen(++port, "127.0.0.1");
  } else {
    console.error(error);
    process.exitCode = 1;
  }
});
server.on("listening", () =>
  console.log(`Portfolio preview: http://localhost:${port}`),
);
server.listen(port, "127.0.0.1");
