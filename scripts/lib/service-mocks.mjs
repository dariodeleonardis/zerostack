// Servizi finti per i test end to end delle operazioni: uno storage S3 (solo le chiamate
// usate dai backup) e un raccoglitore di errori con il protocollo di Sentry/GlitchTip.
import http from "node:http";

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

/** Corpo "aws-chunked" (usato dall'SDK per i flussi): <dimensione esadecimale>;...\r\n<dati>\r\n ... 0\r\n<trailer> */
function decodeAwsChunked(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const eol = buf.indexOf("\r\n", pos);
    if (eol < 0) break;
    const size = parseInt(buf.subarray(pos, eol).toString().split(";")[0], 16);
    if (!size) break;
    out.push(buf.subarray(eol + 2, eol + 2 + size));
    pos = eol + 2 + size + 2;
  }
  return Buffer.concat(out);
}

const xmlEscape = (s) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

export function startS3Mock(port = 12113) {
  /** bucket -> Map(key -> { body, lastModified }) */
  const buckets = new Map();
  const bucket = (name) => {
    if (!buckets.has(name)) buckets.set(name, new Map());
    return buckets.get(name);
  };

  const server = http.createServer(async (req, res) => {
    const raw = await readBody(req);
    const url = new URL(req.url, "http://mock");
    const [, name, ...rest] = url.pathname.split("/");
    const key = decodeURIComponent(rest.join("/"));
    const objects = bucket(name);
    const xml = (status, body) => {
      res.writeHead(status, { "content-type": "application/xml" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?>${body}`);
    };

    if (req.method === "PUT" && key) {
      const chunked = String(req.headers["content-encoding"] ?? "").includes("aws-chunked") || String(req.headers["x-amz-content-sha256"] ?? "").startsWith("STREAMING");
      objects.set(key, { body: chunked ? decodeAwsChunked(raw) : raw, lastModified: new Date() });
      res.writeHead(200, { etag: '"mock"' });
      return res.end();
    }
    if (req.method === "GET" && key) {
      const obj = objects.get(key);
      if (!obj) return xml(404, "<Error><Code>NoSuchKey</Code></Error>");
      res.writeHead(200, { "content-length": obj.body.length });
      return res.end(obj.body);
    }
    if (req.method === "GET" && url.searchParams.get("list-type") === "2") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const contents = [...objects.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, o]) => `<Contents><Key>${xmlEscape(k)}</Key><LastModified>${o.lastModified.toISOString()}</LastModified><Size>${o.body.length}</Size></Contents>`)
        .join("");
      return xml(200, `<ListBucketResult><Name>${name}</Name><Prefix>${xmlEscape(prefix)}</Prefix><IsTruncated>false</IsTruncated>${contents}</ListBucketResult>`);
    }
    if (req.method === "POST" && url.searchParams.has("delete")) {
      const keys = [...raw.toString().matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1].replace(/&lt;|&gt;|&amp;/g, (e) => ({ "&lt;": "<", "&gt;": ">", "&amp;": "&" })[e]));
      keys.forEach((k) => objects.delete(k));
      return xml(200, `<DeleteResult>${keys.map((k) => `<Deleted><Key>${xmlEscape(k)}</Key></Deleted>`).join("")}</DeleteResult>`);
    }
    xml(400, "<Error><Code>NotImplemented</Code></Error>");
  });

  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ port, buckets, close: () => new Promise((r) => server.close(r)) }))
  );
}

/** Raccoglie gli "envelope" di Sentry: POST /api/<progetto>/envelope/ */
export function startErrorCollector(port = 12112) {
  const events = [];
  const server = http.createServer(async (req, res) => {
    const raw = (await readBody(req)).toString();
    const match = /^\/api\/(\w+)\/envelope\/$/.exec(new URL(req.url, "http://mock").pathname);
    if (req.method !== "POST" || !match) {
      res.writeHead(404);
      return res.end();
    }
    const [header, item, payload] = raw.split("\n");
    events.push({ project: match[1], auth: req.headers["x-sentry-auth"], header: JSON.parse(header), item: JSON.parse(item), event: JSON.parse(payload) });
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ port, events, close: () => new Promise((r) => server.close(r)) }))
  );
}
