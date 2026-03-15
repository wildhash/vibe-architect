import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");
const resolvedDistDir = path.resolve(distDir);
const resolvedDistDirPrefix = resolvedDistDir.endsWith(path.sep)
  ? resolvedDistDir
  : `${resolvedDistDir}${path.sep}`;

const portRaw = process.env.PORT;
const defaultPort = 8080;
const portParsed = portRaw ? Number(portRaw) : defaultPort;
// PORT must be a valid TCP port integer (Cloud Run normally sets this correctly).
if (!Number.isInteger(portParsed) || portParsed <= 0 || portParsed > 65535) {
  // eslint-disable-next-line no-console
  console.error(`Invalid PORT: ${String(portRaw)}. Expected an integer in range 1-65535.`);
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

// Requests classified as assets bypass the SPA `index.html` fallback. Most of them are
// served with immutable caching; `.map` is explicitly `no-cache`.
const assetExtensions = new Set([
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

class NotAFileError extends Error {
  constructor(fsPath) {
    super("Not a file");
    this.name = "NotAFileError";
    this.fsPath = fsPath;
  }
}

function toSafeFsPath(urlPath) {
  const normalizedUrlPath = path.posix.normalize(urlPath);
  if (!normalizedUrlPath.startsWith("/")) return null;

  const stripped = normalizedUrlPath.replace(/^\/+/, "");
  if (stripped.includes("\0")) return null;

  const candidate = stripped === "" ? "index.html" : stripped;

  const resolved = path.resolve(resolvedDistDir, candidate);
  if (!resolved.startsWith(resolvedDistDirPrefix)) return null;

  return resolved;
}

function setFileHeaders(res, fsPath, { asset, size }) {
  const ext = path.extname(fsPath).toLowerCase();
  res.setHeader("Content-Type", contentTypes[ext] ?? "application/octet-stream");
  if (typeof size === "number") res.setHeader("Content-Length", String(size));

  // Avoid long-term caching for source maps to reduce accidental exposure/staleness.
  if (ext === ".map") {
    res.setHeader("Cache-Control", "no-cache");
    return;
  }

  if (asset && ext !== ".html") {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }
}

function isNotFoundError(err) {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? err.code : undefined;
  if (code === "ENOENT" || code === "ENOTDIR") return true;
  return err instanceof NotAFileError;
}

function respond500(res) {
  if (res.destroyed) return;
  if (!res.headersSent) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
    return;
  }

  res.destroy();
}

async function serveFile(req, res, fsPath, { asset }) {
  const info = await stat(fsPath);
  if (!info.isFile()) throw new NotAFileError(fsPath);

  if (req.headers.range) {
    res.writeHead(416, {
      "Content-Range": `bytes */${info.size}`,
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Range Not Satisfiable");
    return;
  }

  setFileHeaders(res, fsPath, { asset, size: info.size });

  if (req.method === "HEAD") {
    res.writeHead(200);
    res.end();
    return;
  }

  const stream = createReadStream(fsPath);
  res.once("close", () => {
    stream.destroy();
  });
  stream.on("error", () => {
    respond500(res);
  });
  stream.on("open", () => {
    if (!res.headersSent) res.writeHead(200);
    stream.pipe(res);
  });
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
  const asset = urlPath.startsWith("/assets/") || assetExtensions.has(urlExt);

  try {
    await serveFile(req, res, fsPath, { asset });
    return;
  } catch (err) {
    if (asset) {
      if (isNotFoundError(err)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      respond500(res);
      return;
    }

    if (!isNotFoundError(err)) {
      respond500(res);
      return;
    }

    const indexPath = path.join(distDir, "index.html");
    try {
      await serveFile(req, res, indexPath, { asset: false });
    } catch {
      respond500(res);
    }
  }
});

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on :${port}`);
});
