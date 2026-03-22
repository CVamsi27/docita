Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const fs = require('fs');
const path = require('path');

let manifestCache = null;
let lastAppDirPath = null;
let lastIncludeRouteGroups = undefined;

function isPageFile(filename) {
  return filename === 'page.tsx' || filename === 'page.jsx' || filename === 'page.ts' || filename === 'page.js';
}

function isRouteGroup(name) {
  return name.startsWith('(') && name.endsWith(')');
}

function normalizeRouteGroupPath(routePath) {
  // Remove route group segments from the path
  // Using positive lookahead with (?=[^)\/]*\)) to avoid polynomial matching
  return routePath.replace(/\/\((?=[^)/]*\))[^)/]+\)/g, '');
}

function getDynamicRouteSegment(name) {
  if (name.startsWith('[[...') && name.endsWith(']]')) {
    // Optional catchall: [[...param]]
    const paramName = name.slice(5, -2); // Remove [[... and ]]
    return `:${paramName}*?`; // Mark with ? as optional
  } else if (name.startsWith('[...') && name.endsWith(']')) {
    // Required catchall: [...param]
    const paramName = name.slice(4, -1); // Remove [... and ]
    return `:${paramName}*`;
  }
  // Regular dynamic: [param]
  return `:${name.slice(1, -1)}`;
}

function buildRegexForDynamicRoute(routePath)

 {
  const segments = routePath.split('/').filter(Boolean);
  const regexSegments = [];
  const paramNames = [];
  let hasOptionalCatchall = false;

  for (const segment of segments) {
    if (segment.startsWith(':')) {
      const paramName = segment.substring(1);

      if (paramName.endsWith('*?')) {
        // Optional catchall: matches zero or more segments
        const cleanParamName = paramName.slice(0, -2);
        paramNames.push(cleanParamName);
        // Handling this special case in pattern construction below
        hasOptionalCatchall = true;
      } else if (paramName.endsWith('*')) {
        // Required catchall: matches one or more segments
        const cleanParamName = paramName.slice(0, -1);
        paramNames.push(cleanParamName);
        regexSegments.push('(.+)');
      } else {
        // Regular dynamic segment
        paramNames.push(paramName);
        regexSegments.push('([^/]+)');
      }
    } else {
      // Static segment - escape regex special characters including route group parentheses
      regexSegments.push(segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }

  let pattern;
  if (hasOptionalCatchall) {
    if (regexSegments.length === 0) {
      // If the optional catchall happens at the root, accept any path starting
      // with a slash. Need capturing group for parameter extraction.
      pattern = '^/(.*)$';
    } else {
      // For optional catchall, make the trailing slash and segments optional
      // This allows matching both /catchall and /catchall/anything
      const staticParts = regexSegments.join('/');
      pattern = `^/${staticParts}(?:/(.*))?$`;
    }
  } else {
    pattern = `^/${regexSegments.join('/')}$`;
  }

  return { regex: pattern, paramNames, hasOptionalPrefix: hasOptionalPrefix(paramNames) };
}

/**
 * Detect if the first parameter is a common i18n prefix segment
 * Common patterns: locale, lang, language
 */
function hasOptionalPrefix(paramNames) {
  const firstParam = paramNames[0];
  if (firstParam === undefined) {
    return false;
  }

  return firstParam === 'locale' || firstParam === 'lang' || firstParam === 'language';
}

/**
 * Check if a page file exports generateStaticParams (ISR/SSG indicator)
 */
function checkForGenerateStaticParams(pageFilePath) {
  try {
    const content = fs.readFileSync(pageFilePath, 'utf8');
    // check for generateStaticParams export
    // the regex covers `export function generateStaticParams`, `export async function generateStaticParams`, `export const generateStaticParams`
    return /export\s+(async\s+)?function\s+generateStaticParams|export\s+const\s+generateStaticParams/.test(content);
  } catch {
    return false;
  }
}

function scanAppDirectory(dir, basePath = '', includeRouteGroups = false) {
  const dynamicRoutes = [];
  const staticRoutes = [];
  const isrRoutes = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const pageFile = entries.find(entry => isPageFile(entry.name));

    if (pageFile) {
      // Conditionally normalize the path based on includeRouteGroups option
      const routePath = includeRouteGroups ? basePath || '/' : normalizeRouteGroupPath(basePath || '/');
      const isDynamic = routePath.includes(':');

      // Check if this page has generateStaticParams (ISR/SSG indicator)
      const pageFilePath = path.join(dir, pageFile.name);
      const hasGenerateStaticParams = checkForGenerateStaticParams(pageFilePath);

      if (hasGenerateStaticParams) {
        isrRoutes.push(routePath);
      }

      if (isDynamic) {
        const { regex, paramNames, hasOptionalPrefix } = buildRegexForDynamicRoute(routePath);
        dynamicRoutes.push({
          path: routePath,
          regex,
          paramNames,
          hasOptionalPrefix,
        });
      } else {
        staticRoutes.push({
          path: routePath,
        });
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        let routeSegment;

        const isDynamic = entry.name.startsWith('[') && entry.name.endsWith(']');
        const isRouteGroupDir = isRouteGroup(entry.name);

        if (isRouteGroupDir) {
          if (includeRouteGroups) {
            routeSegment = entry.name;
          } else {
            routeSegment = '';
          }
        } else if (isDynamic) {
          routeSegment = getDynamicRouteSegment(entry.name);
        } else {
          routeSegment = entry.name;
        }

        const newBasePath = routeSegment ? `${basePath}/${routeSegment}` : basePath;
        const subRoutes = scanAppDirectory(fullPath, newBasePath, includeRouteGroups);

        dynamicRoutes.push(...subRoutes.dynamicRoutes);
        staticRoutes.push(...subRoutes.staticRoutes);
        isrRoutes.push(...subRoutes.isrRoutes);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Error building route manifest:', error);
  }

  return { dynamicRoutes, staticRoutes, isrRoutes };
}

/**
 * Returns a route manifest for the given app directory
 */
function createRouteManifest(options) {
  let targetDir;

  if (options?.appDirPath) {
    targetDir = options.appDirPath;
  } else {
    const projectDir = process.cwd();
    const maybeAppDirPath = path.join(projectDir, 'app');
    const maybeSrcAppDirPath = path.join(projectDir, 'src', 'app');

    if (fs.existsSync(maybeAppDirPath) && fs.lstatSync(maybeAppDirPath).isDirectory()) {
      targetDir = maybeAppDirPath;
    } else if (fs.existsSync(maybeSrcAppDirPath) && fs.lstatSync(maybeSrcAppDirPath).isDirectory()) {
      targetDir = maybeSrcAppDirPath;
    }
  }

  if (!targetDir) {
    return {
      isrRoutes: [],
      dynamicRoutes: [],
      staticRoutes: [],
    };
  }

  // Check if we can use cached version
  if (manifestCache && lastAppDirPath === targetDir && lastIncludeRouteGroups === options?.includeRouteGroups) {
    return manifestCache;
  }

  const { dynamicRoutes, staticRoutes, isrRoutes } = scanAppDirectory(
    targetDir,
    options?.basePath,
    options?.includeRouteGroups,
  );

  const manifest = {
    dynamicRoutes,
    staticRoutes,
    isrRoutes,
  };

  // set cache
  manifestCache = manifest;
  lastAppDirPath = targetDir;
  lastIncludeRouteGroups = options?.includeRouteGroups;

  return manifest;
}

exports.createRouteManifest = createRouteManifest;
//# sourceMappingURL=createRouteManifest.js.map
