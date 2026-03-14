import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");

const portRaw = process.env.PORT;
const defaultPort = 8080;
const portParsed = portRaw ? Number(portRaw) : defaultPort;
if (!Number.isFinite(portParsed) || portParsed <= 0) {
  // eslint-disable-next-line no-console
  console.error(`Invalid PORT: ${String(portRaw)}. Expected a positive integer.`);
  process.exit(1);
}
const port = portParsed;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

const cacheableExtensions = new Set([
  ".css",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".map",
  ".png",
  ".svg",
  ".wasm",
]);

function toSafeFsPath(urlPath) {
  const normalizedUrlPath = path.posix.normalize(urlPath);
  if (!normalizedUrlPath.startsWith("/")) return null;

  const stripped = normalizedUrlPath.replace(/^\/+/, "");
  if (stripped === "") return path.join(distDir, "index.html");

  const fsPath = path.join(distDir, stripped);
  const rel = path.relative(distDir, fsPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return fsPath;
}

function setFileHeaders(res, fsPath, { cache, size }) {
  const ext = path.extname(fsPath).toLowerCase();
  res.setHeader("Content-Type", contentTypes[ext] ?? "application/octet-stream");
  if (typeof size === "number") res.setHeader("Content-Length", String(size));
  if (cache) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
}

async function serveFile(req, res, fsPath, { cache }) {
  const info = await stat(fsPath);
  if (!info.isFile()) throw new Error("Not a file");

  setFileHeaders(res, fsPath, { cache, size: info.size });
  res.writeHead(200);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(fsPath);
  stream.on("error", () => {
    res.end("Internal Server Error");
  });
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  let urlPath;
  try {
    urlPath = decodeURIComponent(requestUrl.pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  if (urlPath === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  const fsPath = toSafeFsPath(urlPath);
  if (!fsPath) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const urlExt = path.posix.extname(urlPath).toLowerCase();
  const cache = urlPath.startsWith("/assets/") || cacheableExtensions.has(urlExt);

  try {
    await serveFile(req, res, fsPath, { cache });
    return;
  } catch {
    if (cache) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const indexPath = path.join(distDir, "index.html");
    try {
      await serveFile(req, res, indexPath, { cache: false });
    } catch {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on :${port}`);
});
