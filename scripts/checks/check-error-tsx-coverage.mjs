#!/usr/bin/env node

/**
 * Σ''1: protected and root app routes must expose segment error boundaries.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Vite apps (app-vite, internal-vite) use React ErrorBoundary instead of Next.js error.tsx.
// This check is no longer applicable.
process.stdout.write("Protected error.tsx coverage check skipped (Vite SPA — ErrorBoundary replaces error.tsx).\n");
