#!/usr/bin/env node
// Ensures (tools)/ stays a dev-only surface.
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 54.
//
// 1. The (tools)/ layout must call notFound() unless tools are enabled.
// 2. No production-facing feature should live under (tools)/.
//    Known dev-only feature prefixes are allowlisted below.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Next.js apps have been replaced by Vite. The (tools)/ route gate is no longer applicable.
console.log("[tools-route-gate] Skipped — Next.js apps have been replaced by Vite.");
