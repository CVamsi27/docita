import * as path from "path";

/**
 * Shared building blocks for the `apps/app` and `apps/internal` Vitest
 * configs. Both apps are Next.js apps with an identical workspace alias
 * map and near-identical test/coverage skeletons — only the coverage
 * `include` globs and a handful of test-exclude globs differ per app.
 *
 * Kept dependency-free (Node builtins only) so it can be imported from the
 * repo root without pulling in app-local `vitest`/`@vitejs/plugin-react`
 * resolution concerns; each app still owns its own `defineConfig` + plugin
 * wiring.
 */

export interface WorkspaceAliasOptions {
  /** Absolute path to the app's root directory (pass `__dirname`). */
  rootDir: string;
}

export function buildWorkspaceAliases({ rootDir }: WorkspaceAliasOptions) {
  return [
    {
      find: /^@\/components\/(.*)$/,
      replacement: path.resolve(rootDir, "./shared/components/$1"),
    },
    {
      find: /^@\/hooks\/(.*)$/,
      replacement: path.resolve(rootDir, "./shared/hooks/$1"),
    },
    {
      find: /^@\/lib\/(.*)$/,
      replacement: path.resolve(rootDir, "./shared/lib/$1"),
    },
    {
      find: /^@\/(.*)$/,
      replacement: path.resolve(rootDir, "./$1"),
    },
    {
      find: "@workspace/ui",
      replacement: path.resolve(rootDir, "../../packages/ui/src"),
    },
    {
      find: "@workspace/types",
      replacement: path.resolve(rootDir, "../../packages/types/src"),
    },
    {
      find: "@workspace/utils",
      replacement: path.resolve(rootDir, "../../packages/utils/src"),
    },
    {
      find: "@workspace/hooks",
      replacement: path.resolve(rootDir, "../../packages/hooks/src"),
    },
    {
      find: "@workspace/data-access",
      replacement: path.resolve(rootDir, "../../packages/data-access/src"),
    },
  ];
}

export const WORKSPACE_TEST_EXCLUDE = [
  "e2e/**",
  ".next/**",
  ".open-next/**",
  "test-results/**",
];

export const WORKSPACE_COVERAGE_BASE = {
  reporter: ["text", "html"] as Array<"text" | "html">,
  exclude: [
    "e2e/**",
    "**/*.d.ts",
    "**/*.config.*",
    "**/.next/**",
    "**/.open-next/**",
  ],
  thresholds: {
    lines: 30,
    statements: 30,
    functions: 30,
    branches: 25,
  },
};

export interface WorkspaceTestConfigOptions {
  /** Pass `configDefaults.exclude` from the app's own `vitest/config` import. */
  defaultExclude: readonly string[];
  setupFiles: string[];
  /** App-specific exclude globs layered on top of the shared workspace set. */
  extraExclude?: string[];
  /** App-specific coverage include globs (the only part that meaningfully differs). */
  coverageInclude: string[];
}

export function buildWorkspaceTestConfig({
  defaultExclude,
  setupFiles,
  extraExclude = [],
  coverageInclude,
}: WorkspaceTestConfigOptions) {
  return {
    globals: true,
    environment: "jsdom" as const,
    setupFiles,
    css: true,
    testTimeout: 30000,
    exclude: [...defaultExclude, ...WORKSPACE_TEST_EXCLUDE, ...extraExclude],
    coverage: {
      ...WORKSPACE_COVERAGE_BASE,
      include: coverageInclude,
    },
  };
}

export interface AppVitestConfigOptions extends WorkspaceTestConfigOptions {
  /** Absolute path to the app's root directory (pass `__dirname`). */
  rootDir: string;
}

/**
 * Combines `buildWorkspaceTestConfig` and `buildWorkspaceAliases` into the
 * `test`/`resolve` slice each app spreads into its own `defineConfig({...})`.
 * Both apps wired these two builders together identically — the only inputs
 * that differ are `rootDir` and the `WorkspaceTestConfigOptions` fields — so
 * collapsing the pairing here keeps each `vitest.config.ts` down to its
 * `defineConfig` + `plugins` wiring and its own option values.
 */
export function buildAppVitestConfig({
  rootDir,
  ...testConfigOptions
}: AppVitestConfigOptions) {
  return {
    test: buildWorkspaceTestConfig(testConfigOptions),
    resolve: {
      alias: buildWorkspaceAliases({ rootDir }),
    },
  };
}
