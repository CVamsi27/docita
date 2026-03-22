Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const getBuildPluginOptions = require('./getBuildPluginOptions.js');

/**
 * This function is called by Next.js after the production build is complete.
 * It is used to upload sourcemaps to Sentry.
 */
async function handleRunAfterProductionCompile(
  {
    releaseName,
    distDir,
    buildTool,
    usesNativeDebugIds,
  },
  sentryBuildOptions,
) {
  if (sentryBuildOptions.debug) {
    // eslint-disable-next-line no-console
    console.debug('[@sentry/nextjs] Running runAfterProductionCompile logic.');
  }

  const { createSentryBuildPluginManager } =
    core.loadModule(
      '@sentry/bundler-plugin-core',
      module,
    ) ?? {};

  if (!createSentryBuildPluginManager) {
    // eslint-disable-next-line no-console
    console.warn(
      '[@sentry/nextjs] Could not load build manager package. Will not run runAfterProductionCompile logic.',
    );
    return;
  }

  const options = getBuildPluginOptions.getBuildPluginOptions({
    sentryBuildOptions,
    releaseName,
    distDirAbsPath: distDir,
    buildTool: `after-production-compile-${buildTool}`,
  });

  const sentryBuildPluginManager = createSentryBuildPluginManager(options, {
    buildTool,
    loggerPrefix: '[@sentry/nextjs - After Production Compile]',
  });

  await sentryBuildPluginManager.telemetry.emitBundlerPluginExecutionSignal();
  await sentryBuildPluginManager.createRelease();

  // Skip debug ID injection if sourcemaps are disabled which are only relevant for sourcemap correlation
  if (!usesNativeDebugIds && sentryBuildOptions.sourcemaps?.disable !== true) {
    await sentryBuildPluginManager.injectDebugIds([distDir]);
  }

  await sentryBuildPluginManager.uploadSourcemaps([distDir], {
    // We don't want to prepare the artifacts because we injected debug ids manually before
    prepareArtifacts: false,
  });
  await sentryBuildPluginManager.deleteArtifacts();
}

exports.handleRunAfterProductionCompile = handleRunAfterProductionCompile;
//# sourceMappingURL=handleRunAfterProductionCompile.js.map
