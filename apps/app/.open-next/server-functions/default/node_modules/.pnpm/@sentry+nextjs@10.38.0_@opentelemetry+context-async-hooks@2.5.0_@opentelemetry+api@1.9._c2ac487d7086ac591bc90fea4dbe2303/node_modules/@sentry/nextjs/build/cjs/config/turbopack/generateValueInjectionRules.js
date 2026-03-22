Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const path = require('path');

/**
 * Generate the value injection rules for client and server in turbopack config.
 */
function generateValueInjectionRules({
  routeManifest,
  nextJsVersion,
  tunnelPath,
}

) {
  const rules = [];
  const isomorphicValues = {};
  let clientValues = {};
  let serverValues = {};

  if (nextJsVersion) {
    // This is used to determine version-based dev-symbolication behavior
    isomorphicValues._sentryNextJsVersion = nextJsVersion;
  }

  if (routeManifest) {
    clientValues._sentryRouteManifest = JSON.stringify(routeManifest);
  }

  // Inject tunnel route path for both client and server
  if (tunnelPath) {
    isomorphicValues._sentryRewritesTunnelPath = tunnelPath;
  }

  if (Object.keys(isomorphicValues).length > 0) {
    clientValues = { ...clientValues, ...isomorphicValues };
    serverValues = { ...serverValues, ...isomorphicValues };
  }

  // Client value injection
  if (Object.keys(clientValues).length > 0) {
    rules.push({
      matcher: '**/instrumentation-client.*',
      rule: {
        loaders: [
          {
            loader: path.resolve(__dirname, '..', 'loaders', 'valueInjectionLoader.js'),
            options: {
              values: clientValues,
            },
          },
        ],
      },
    });
  }

  // Server value injection
  if (Object.keys(serverValues).length > 0) {
    rules.push({
      matcher: '**/instrumentation.*',
      rule: {
        loaders: [
          {
            loader: path.resolve(__dirname, '..', 'loaders', 'valueInjectionLoader.js'),
            options: {
              values: serverValues,
            },
          },
        ],
      },
    });
  }

  return rules;
}

exports.generateValueInjectionRules = generateValueInjectionRules;
//# sourceMappingURL=generateValueInjectionRules.js.map
