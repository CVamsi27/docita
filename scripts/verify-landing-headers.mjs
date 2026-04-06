import { execFileSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://landing.docita.work";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env["LANDING_BASE_URL"] || DEFAULT_BASE_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--url") {
      const value = argv[index + 1];
      if (value) {
        args.baseUrl = value;
        index += 1;
      }
    }
  }

  return args;
}

function normalizeBaseUrl(rawUrl) {
  const value = (rawUrl || "").trim();
  if (!value) {
    throw new Error("Base URL is required. Pass --url or set LANDING_BASE_URL.");
  }
  return value.replace(/\/+$/, "");
}

function absoluteUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

function formatHeader(headers, name) {
  return headers.get(name) ?? "<missing>";
}

function parseMaxAge(cacheControlValue) {
  if (!cacheControlValue) return null;
  const match = cacheControlValue.match(/(?:^|,\s*)max-age=(\d+)/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function printReportLine(label, value) {
  process.stdout.write(`${label}: ${value}\n`);
}

function parseHeaders(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const statusLine = lines.find((line) => line.startsWith("HTTP/")) ?? "<missing>";
  const headers = new Map();

  for (const line of lines) {
    if (line.startsWith("HTTP/")) {
      continue;
    }
    const delimiterIndex = line.indexOf(":");
    if (delimiterIndex <= 0) {
      continue;
    }
    const key = line.slice(0, delimiterIndex).trim().toLowerCase();
    const value = line.slice(delimiterIndex + 1).trim();
    headers.set(key, value);
  }

  return { statusLine, headers };
}

function curlHeaders(url) {
  const output = execFileSync(
    "curl",
    ["-sSI", "--compressed", url],
    { encoding: "utf8" },
  );

  return parseHeaders(output);
}

function curlBody(url) {
  return execFileSync("curl", ["-sSL", url], { encoding: "utf8" });
}

function findFirstAssetPath(html) {
  const matches = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)];
  const candidates = matches.map((match) => match[1]);

  const preferred = candidates.find((value) =>
    /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)($|\?)/i.test(value),
  );

  return preferred ?? null;
}

function isSuccessStatus(statusLine) {
  return /^HTTP\/[\d.]+\s+2\d\d\b/i.test(statusLine);
}

async function main() {
  const { baseUrl: rawBaseUrl } = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  const homeUrl = absoluteUrl(baseUrl, "/");
  const robotsUrl = absoluteUrl(baseUrl, "/robots.txt");

  const homeHeadersResult = curlHeaders(homeUrl);
  if (!isSuccessStatus(homeHeadersResult.statusLine)) {
    throw new Error(`Failed to fetch headers for ${homeUrl}: ${homeHeadersResult.statusLine}`);
  }

  const homeCacheControl = homeHeadersResult.headers.get("cache-control");
  const homeExpires = homeHeadersResult.headers.get("expires");
  const homeEncoding = homeHeadersResult.headers.get("content-encoding");

  const homeHtml = curlBody(homeUrl);
  const assetPath = findFirstAssetPath(homeHtml);

  if (!assetPath) {
    throw new Error("Unable to find any static asset URL from landing home page.");
  }

  const assetUrl = assetPath.startsWith("http")
    ? assetPath
    : new URL(assetPath, `${baseUrl}/`).toString();
  const assetHeadersResult = curlHeaders(assetUrl);
  if (!isSuccessStatus(assetHeadersResult.statusLine)) {
    throw new Error(
      `Failed to fetch headers for ${assetUrl}: ${assetHeadersResult.statusLine}`,
    );
  }

  const robotsHeadersResult = curlHeaders(robotsUrl);
  if (!isSuccessStatus(robotsHeadersResult.statusLine)) {
    throw new Error(
      `Failed to fetch headers for ${robotsUrl}: ${robotsHeadersResult.statusLine}`,
    );
  }

  const assetCacheControl = assetHeadersResult.headers.get("cache-control");
  const assetExpires = assetHeadersResult.headers.get("expires");
  const assetEncoding = assetHeadersResult.headers.get("content-encoding");
  const robotsCacheControl = robotsHeadersResult.headers.get("cache-control");
  const robotsExpires = robotsHeadersResult.headers.get("expires");

  printReportLine("Base URL", baseUrl);
  printReportLine("Home URL", homeUrl);
  printReportLine(
    "Home Cache-Control",
    formatHeader(homeHeadersResult.headers, "cache-control"),
  );
  printReportLine("Home Expires", homeExpires ?? "<missing>");
  printReportLine("Home Content-Encoding", homeEncoding ?? "<missing>");
  printReportLine("Asset URL", assetUrl);
  printReportLine("Asset Cache-Control", assetCacheControl ?? "<missing>");
  printReportLine("Asset Expires", assetExpires ?? "<missing>");
  printReportLine("Asset Content-Encoding", assetEncoding ?? "<missing>");
  printReportLine("Robots Cache-Control", robotsCacheControl ?? "<missing>");
  printReportLine("Robots Expires", robotsExpires ?? "<missing>");

  const failures = [];

  if (!homeCacheControl || !homeCacheControl.toLowerCase().includes("max-age=")) {
    failures.push("Home response is missing Cache-Control max-age.");
  }
  if (!homeExpires) {
    failures.push("Home response is missing Expires header.");
  }

  const assetMaxAge = parseMaxAge(assetCacheControl);
  if (assetMaxAge === null || assetMaxAge < 86400) {
    failures.push("Asset max-age is too low or missing (expected >= 86400 seconds).");
  }
  if (!assetExpires) {
    failures.push("Asset response is missing Expires header.");
  }

  const encodingValue = `${homeEncoding || ""},${assetEncoding || ""}`.toLowerCase();
  if (!encodingValue.includes("gzip") && !encodingValue.includes("br")) {
    failures.push(
      "Neither home nor asset response reports gzip/br compression via Content-Encoding.",
    );
  }

  if (!robotsCacheControl || !robotsExpires) {
    failures.push("robots.txt is missing cache headers.");
  }

  if (failures.length > 0) {
    process.stderr.write("\nHeader verification failed:\n");
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("\nHeader verification passed.\n");
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unexpected error"}\n`,
  );
  process.exit(1);
});
