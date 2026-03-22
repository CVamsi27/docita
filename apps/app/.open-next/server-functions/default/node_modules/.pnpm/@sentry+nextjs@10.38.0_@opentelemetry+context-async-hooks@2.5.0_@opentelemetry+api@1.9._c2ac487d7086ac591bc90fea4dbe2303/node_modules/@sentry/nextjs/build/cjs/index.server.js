Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const index$1 = require('./config/withSentryConfig/index.js');
const index = require('./server/index.js');
const node = require('@sentry/node');
const captureRequestError = require('./common/captureRequestError.js');
const _error = require('./common/pages-router-instrumentation/_error.js');
const nextSpan = require('./common/utils/nextSpan.js');
const withServerActionInstrumentation = require('./common/withServerActionInstrumentation.js');
const wrapApiHandlerWithSentry = require('./common/pages-router-instrumentation/wrapApiHandlerWithSentry.js');
const wrapApiHandlerWithSentryVercelCrons = require('./common/pages-router-instrumentation/wrapApiHandlerWithSentryVercelCrons.js');
const wrapAppGetInitialPropsWithSentry = require('./common/pages-router-instrumentation/wrapAppGetInitialPropsWithSentry.js');
const wrapDocumentGetInitialPropsWithSentry = require('./common/pages-router-instrumentation/wrapDocumentGetInitialPropsWithSentry.js');
const wrapErrorGetInitialPropsWithSentry = require('./common/pages-router-instrumentation/wrapErrorGetInitialPropsWithSentry.js');
const wrapGenerationFunctionWithSentry = require('./common/wrapGenerationFunctionWithSentry.js');
const wrapGetInitialPropsWithSentry = require('./common/pages-router-instrumentation/wrapGetInitialPropsWithSentry.js');
const wrapGetServerSidePropsWithSentry = require('./common/pages-router-instrumentation/wrapGetServerSidePropsWithSentry.js');
const wrapGetStaticPropsWithSentry = require('./common/pages-router-instrumentation/wrapGetStaticPropsWithSentry.js');
const wrapMiddlewareWithSentry = require('./common/wrapMiddlewareWithSentry.js');
const wrapPageComponentWithSentry = require('./common/pages-router-instrumentation/wrapPageComponentWithSentry.js');
const wrapRouteHandlerWithSentry = require('./common/wrapRouteHandlerWithSentry.js');
const wrapServerComponentWithSentry = require('./common/wrapServerComponentWithSentry.js');



exports.withSentryConfig = index$1.withSentryConfig;
exports.ErrorBoundary = index.ErrorBoundary;
exports.createReduxEnhancer = index.createReduxEnhancer;
exports.init = index.init;
exports.showReportDialog = index.showReportDialog;
exports.withErrorBoundary = index.withErrorBoundary;
exports.captureRequestError = captureRequestError.captureRequestError;
exports.captureUnderscoreErrorException = _error.captureUnderscoreErrorException;
exports.startInactiveSpan = nextSpan.startInactiveSpan;
exports.startSpan = nextSpan.startSpan;
exports.startSpanManual = nextSpan.startSpanManual;
exports.withServerActionInstrumentation = withServerActionInstrumentation.withServerActionInstrumentation;
exports.wrapApiHandlerWithSentry = wrapApiHandlerWithSentry.wrapApiHandlerWithSentry;
exports.wrapApiHandlerWithSentryVercelCrons = wrapApiHandlerWithSentryVercelCrons.wrapApiHandlerWithSentryVercelCrons;
exports.wrapAppGetInitialPropsWithSentry = wrapAppGetInitialPropsWithSentry.wrapAppGetInitialPropsWithSentry;
exports.wrapDocumentGetInitialPropsWithSentry = wrapDocumentGetInitialPropsWithSentry.wrapDocumentGetInitialPropsWithSentry;
exports.wrapErrorGetInitialPropsWithSentry = wrapErrorGetInitialPropsWithSentry.wrapErrorGetInitialPropsWithSentry;
exports.wrapGenerationFunctionWithSentry = wrapGenerationFunctionWithSentry.wrapGenerationFunctionWithSentry;
exports.wrapGetInitialPropsWithSentry = wrapGetInitialPropsWithSentry.wrapGetInitialPropsWithSentry;
exports.wrapGetServerSidePropsWithSentry = wrapGetServerSidePropsWithSentry.wrapGetServerSidePropsWithSentry;
exports.wrapGetStaticPropsWithSentry = wrapGetStaticPropsWithSentry.wrapGetStaticPropsWithSentry;
exports.wrapMiddlewareWithSentry = wrapMiddlewareWithSentry.wrapMiddlewareWithSentry;
exports.wrapPageComponentWithSentry = wrapPageComponentWithSentry.wrapPageComponentWithSentry;
exports.wrapRouteHandlerWithSentry = wrapRouteHandlerWithSentry.wrapRouteHandlerWithSentry;
exports.wrapServerComponentWithSentry = wrapServerComponentWithSentry.wrapServerComponentWithSentry;
Object.prototype.hasOwnProperty.call(node, '__proto__') &&
	!Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
	Object.defineProperty(exports, '__proto__', {
		enumerable: true,
		value: node['__proto__']
	});

Object.keys(node).forEach(k => {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = node[k];
});
//# sourceMappingURL=index.server.js.map
