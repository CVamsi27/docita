#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse } from "smol-toml";

const usage = `Usage: node scripts/deploy/rollback-fly-image.mjs --config <fly.toml> --image <recorded-image>

Select an image recorded by flyctl releases --app <configured-app> --image.
The image must belong to registry.fly.io/<configured-app> and have an explicit
tag other than latest, or a sha256 digest. The helper never selects a release.

This redeploys application code using the current config and secrets. It skips
the release command and does not undo database migrations. Before running it,
verify that the selected image works with the current configuration and schema.
`;

function deploymentArguments() {
  const { values, tokens } = parseArgs({
    options: {
      config: { type: "string" },
      image: { type: "string" },
      help: { type: "boolean" },
    },
    strict: true,
    allowPositionals: false,
    tokens: true,
  });
  if (values.help) {
    process.stdout.write(usage);
    return null;
  }
  if (!values.config || !values.image) {
    throw new Error("Both --config and --image are required.");
  }
  for (const name of ["config", "image"]) {
    if (
      tokens.filter((token) => token.kind === "option" && token.name === name)
        .length > 1
    ) {
      throw new Error(`Select exactly one --${name}.`);
    }
  }

  const configPath = resolve(values.config);
  let source;
  try {
    source = readFileSync(configPath, "utf8");
  } catch {
    throw new Error("The selected Fly config file cannot be read.");
  }
  let config;
  try {
    config = parse(source);
  } catch {
    throw new Error("The selected Fly config is not valid TOML.");
  }
  const app = config.app;
  if (
    typeof app !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(app)
  ) {
    throw new Error("Fly config must contain a valid app name.");
  }
  const region = config.primary_region;
  if (typeof region !== "string" || !/^[a-z]{3}$/.test(region)) {
    throw new Error("Fly config must contain a valid primary_region.");
  }

  const prefix = `registry.fly.io/${app}`;
  const reference = values.image.startsWith(prefix)
    ? values.image.slice(prefix.length)
    : "";
  const tag =
    /^:([A-Za-z0-9_][A-Za-z0-9_.-]{0,127})(?:@sha256:[a-f0-9]{64})?$/.exec(
      reference,
    );
  const digest = /^@sha256:[a-f0-9]{64}$/.test(reference);
  if ((!tag && !digest) || tag?.[1]?.toLowerCase() === "latest") {
    throw new Error(
      `Select a recorded image for ${prefix} with an explicit tag other than latest or a sha256 digest.`,
    );
  }

  const hasHttpService = config.http_service !== undefined;
  return [
    "deploy",
    "--config",
    configPath,
    "--app",
    app,
    "--image",
    values.image,
    "--primary-region",
    region,
    "--strategy",
    hasHttpService ? "bluegreen" : "rolling",
    ...(hasHttpService ? [] : ["--ha=false"]),
    "--skip-release-command",
  ];
}

let args;
try {
  args = deploymentArguments();
} catch (error) {
  process.stderr.write(
    `Rollback validation failed: ${error instanceof Error ? error.message : "Invalid arguments."}\n`,
  );
  process.exitCode = 1;
}
if (args) {
  process.stdout.write(
    "Redeploying the selected image with current config and secrets; release command skipped.\n",
  );
  const result = spawnSync("flyctl", args, { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(
      "Unable to start flyctl for the selected image rollback.\n",
    );
    process.exitCode = result.error.code === "ENOENT" ? 127 : 1;
  } else if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exitCode = result.status ?? 1;
  }
}
