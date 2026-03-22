Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const react = require('@sentry/react');
const parameterization = require('./parameterization.js');

const INCOMPLETE_APP_ROUTER_INSTRUMENTATION_TRANSACTION_NAME = 'incomplete-app-router-transaction';

/**
 * This mutable keeps track of what router navigation instrumentation mechanism we are using.
 *
 * The default one is 'router-patch' which is a way of instrumenting that worked up until Next.js 15.3.0 was released.
 * For this method we took the global router instance and simply monkey patched all the router methods like push(), replace(), and so on.
 * This worked because Next.js itself called the router methods for things like the <Link /> component.
 * Vercel decided that it is not good to call these public API methods from within the framework so they switched to an internal system that completely bypasses our monkey patching. This happened in 15.3.0.
 *
 * We raised with Vercel that this breaks our SDK so together with them we came up with an API for `instrumentation-client.ts` called `onRouterTransitionStart` that is called whenever a navigation is kicked off.
 *
 * Now we have the problem of version compatibility.
 * For older Next.js versions we cannot use the new hook so we need to always patch the router.
 * For newer Next.js versions we cannot know whether the user actually registered our handler for the `onRouterTransitionStart` hook, so we need to wait until it was called at least once before switching the instrumentation mechanism.
 * The problem is, that the user may still have registered a hook and then call a patched router method.
 * First, the monkey patched router method will be called, starting a navigation span, then the hook will also called.
 * We need to handle this case and not create two separate navigation spans but instead update the current navigation span and then switch to the new instrumentation mode.
 * This is all denoted by this `navigationRoutingMode` variable.
 */
let navigationRoutingMode = 'router-patch';

const currentRouterPatchingNavigationSpanRef = { current: undefined };

/** Instruments the Next.js app router for pageloads. */
function appRouterInstrumentPageLoad(client) {
  const parameterizedPathname = parameterization.maybeParameterizeRoute(react.WINDOW.location.pathname);
  const origin = core.browserPerformanceTimeOrigin();
  react.startBrowserTracingPageLoadSpan(client, {
    name: parameterizedPathname ?? react.WINDOW.location.pathname,
    // pageload should always start at timeOrigin (and needs to be in s, not ms)
    startTime: origin ? origin / 1000 : undefined,
    attributes: {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'pageload',
      [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.pageload.nextjs.app_router_instrumentation',
      [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: parameterizedPathname ? 'route' : 'url',
    },
  });
}

// Yes, yes, I know we shouldn't depend on these internals. But that's where we are at. We write the ugly code, so you don't have to.
const GLOBAL_OBJ_WITH_NEXT_ROUTER = core.GLOBAL_OBJ

;

const globalWithInjectedBasePath = core.GLOBAL_OBJ

;

/*
 * The routing instrumentation needs to handle a few cases:
 * - Router operations:
 *  - router.push() (either explicitly called or implicitly through <Link /> tags)
 *  - router.replace() (either explicitly called or implicitly through <Link replace /> tags)
 *  - router.back()
 *  - router.forward()
 * - Browser operations:
 *  - native Browser-back / popstate event (implicitly called by router.back())
 *  - native Browser-forward / popstate event (implicitly called by router.forward())
 */

/** Instruments the Next.js app router for navigation. */
function appRouterInstrumentNavigation(client) {
  routerTransitionHandler = (href, navigationType) => {
    const basePath = process.env._sentryBasePath ?? globalWithInjectedBasePath._sentryBasePath;
    const normalizedHref = basePath && !href.startsWith(basePath) ? `${basePath}${href}` : href;
    const unparameterizedPathname = new URL(normalizedHref, react.WINDOW.location.href).pathname;
    const parameterizedPathname = parameterization.maybeParameterizeRoute(unparameterizedPathname);
    const pathname = parameterizedPathname ?? unparameterizedPathname;

    if (navigationRoutingMode === 'router-patch') {
      navigationRoutingMode = 'transition-start-hook';
    }

    const currentNavigationSpan = currentRouterPatchingNavigationSpanRef.current;
    if (currentNavigationSpan) {
      currentNavigationSpan.updateName(pathname);
      currentNavigationSpan.setAttributes({
        'navigation.type': `router.${navigationType}`,
        [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: parameterizedPathname ? 'route' : 'url',
      });
      currentRouterPatchingNavigationSpanRef.current = undefined;
    } else {
      react.startBrowserTracingNavigationSpan(client, {
        name: pathname,
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'navigation',
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.nextjs.app_router_instrumentation',
          [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: parameterizedPathname ? 'route' : 'url',
          'navigation.type': `router.${navigationType}`,
        },
      });
    }
  };

  react.WINDOW.addEventListener('popstate', () => {
    const parameterizedPathname = parameterization.maybeParameterizeRoute(react.WINDOW.location.pathname);
    if (currentRouterPatchingNavigationSpanRef.current?.isRecording()) {
      currentRouterPatchingNavigationSpanRef.current.updateName(parameterizedPathname ?? react.WINDOW.location.pathname);
      currentRouterPatchingNavigationSpanRef.current.setAttribute(
        core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
        parameterizedPathname ? 'route' : 'url',
      );
    } else {
      currentRouterPatchingNavigationSpanRef.current = react.startBrowserTracingNavigationSpan(client, {
        name: parameterizedPathname ?? react.WINDOW.location.pathname,
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.nextjs.app_router_instrumentation',
          [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: parameterizedPathname ? 'route' : 'url',
          'navigation.type': 'browser.popstate',
        },
      });
    }
  });

  let routerPatched = false;
  let triesToFindRouter = 0;
  const MAX_TRIES_TO_FIND_ROUTER = 500;
  const ROUTER_AVAILABILITY_CHECK_INTERVAL_MS = 20;
  const checkForRouterAvailabilityInterval = setInterval(() => {
    triesToFindRouter++;
    const router = GLOBAL_OBJ_WITH_NEXT_ROUTER?.next?.router ?? GLOBAL_OBJ_WITH_NEXT_ROUTER?.nd?.router;

    if (routerPatched || triesToFindRouter > MAX_TRIES_TO_FIND_ROUTER) {
      clearInterval(checkForRouterAvailabilityInterval);
    } else if (router) {
      clearInterval(checkForRouterAvailabilityInterval);
      routerPatched = true;

      patchRouter(client, router, currentRouterPatchingNavigationSpanRef);

      // If the router at any point gets overridden - patch again
      (['nd', 'next'] ).forEach(globalValueName => {
        const globalValue = GLOBAL_OBJ_WITH_NEXT_ROUTER[globalValueName];
        if (globalValue) {
          GLOBAL_OBJ_WITH_NEXT_ROUTER[globalValueName] = new Proxy(globalValue, {
            set(target, p, newValue) {
              if (p === 'router' && typeof newValue === 'object' && newValue !== null) {
                patchRouter(client, newValue, currentRouterPatchingNavigationSpanRef);
              }

              // @ts-expect-error we cannot possibly type this
              target[p] = newValue;
              return true;
            },
          });
        }
      });
    }
  }, ROUTER_AVAILABILITY_CHECK_INTERVAL_MS);
}

function transactionNameifyRouterArgument(target) {
  try {
    // We provide an arbitrary base because we only care about the pathname and it makes URL parsing more resilient.
    return new URL(target, 'http://example.com/').pathname;
  } catch {
    return '/';
  }
}

const patchedRouters = new WeakSet();

function patchRouter(client, router, currentNavigationSpanRef) {
  if (patchedRouters.has(router)) {
    return;
  }
  patchedRouters.add(router);

  (['back', 'forward', 'push', 'replace'] ).forEach(routerFunctionName => {
    if (router?.[routerFunctionName]) {
      // @ts-expect-error Weird type error related to not knowing how to associate return values with the individual functions - we can just ignore
      router[routerFunctionName] = new Proxy(router[routerFunctionName], {
        apply(target, thisArg, argArray) {
          if (navigationRoutingMode !== 'router-patch') {
            return target.apply(thisArg, argArray);
          }

          let transactionName = INCOMPLETE_APP_ROUTER_INSTRUMENTATION_TRANSACTION_NAME;
          const transactionAttributes = {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'navigation',
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.nextjs.app_router_instrumentation',
            [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
          };

          const href = argArray[0];
          const basePath = process.env._sentryBasePath ?? globalWithInjectedBasePath._sentryBasePath;
          const normalizedHref =
            basePath && typeof href === 'string' && !href.startsWith(basePath) ? `${basePath}${href}` : href;
          if (routerFunctionName === 'push') {
            transactionName = transactionNameifyRouterArgument(normalizedHref);
            transactionAttributes['navigation.type'] = 'router.push';
          } else if (routerFunctionName === 'replace') {
            transactionName = transactionNameifyRouterArgument(normalizedHref);
            transactionAttributes['navigation.type'] = 'router.replace';
          } else if (routerFunctionName === 'back') {
            transactionAttributes['navigation.type'] = 'router.back';
          } else if (routerFunctionName === 'forward') {
            transactionAttributes['navigation.type'] = 'router.forward';
          }

          const parameterizedPathname = parameterization.maybeParameterizeRoute(transactionName);

          currentNavigationSpanRef.current = react.startBrowserTracingNavigationSpan(client, {
            name: parameterizedPathname ?? transactionName,
            attributes: {
              ...transactionAttributes,
              [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: parameterizedPathname ? 'route' : 'url',
            },
          });

          return target.apply(thisArg, argArray);
        },
      });
    }
  });
}

let routerTransitionHandler = undefined;

/**
 * A handler for Next.js' `onRouterTransitionStart` hook in `instrumentation-client.ts` to record navigation spans in Sentry.
 */
function captureRouterTransitionStart(href, navigationType) {
  if (routerTransitionHandler) {
    routerTransitionHandler(href, navigationType);
  }
}

exports.INCOMPLETE_APP_ROUTER_INSTRUMENTATION_TRANSACTION_NAME = INCOMPLETE_APP_ROUTER_INSTRUMENTATION_TRANSACTION_NAME;
exports.appRouterInstrumentNavigation = appRouterInstrumentNavigation;
exports.appRouterInstrumentPageLoad = appRouterInstrumentPageLoad;
exports.captureRouterTransitionStart = captureRouterTransitionStart;
//# sourceMappingURL=appRouterRoutingInstrumentation.js.map
