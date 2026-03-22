import * as serverComponentModule from '__SENTRY_WRAPPING_TARGET_FILE__';
export * from '__SENTRY_WRAPPING_TARGET_FILE__';
import * as Sentry from '@sentry/nextjs';

/*
 * This file is a template for the code which will be substituted when our webpack loader handles non-API files in the
 * `pages/` directory.
 *
 * We use `__SENTRY_WRAPPING_TARGET_FILE__` as a placeholder for the path to the file being wrapped. Because it's not a real package,
 * this causes both TS and ESLint to complain, hence the pragma comments below.
 */


const userPageModule = serverComponentModule ;

const pageComponent = userPageModule ? userPageModule.default : undefined;

const origGetInitialProps = pageComponent ? pageComponent.getInitialProps : undefined;
const origGetStaticProps = userPageModule ? userPageModule.getStaticProps : undefined;
const origGetServerSideProps = userPageModule ? userPageModule.getServerSideProps : undefined;

// Rollup will aggressively tree-shake what it perceives to be unused properties
// on objects. Because the key that's used to index into this object (__ROUTE__)
// is replaced during bundling, Rollup can't see that these properties are in fact
// used. Using `Object.freeze` signals to Rollup that it should not tree-shake
// this object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getInitialPropsWrappers = Object.freeze({
  '/_app': Sentry.wrapAppGetInitialPropsWithSentry,
  '/_document': Sentry.wrapDocumentGetInitialPropsWithSentry,
  '/_error': Sentry.wrapErrorGetInitialPropsWithSentry,
});

const getInitialPropsWrapper = getInitialPropsWrappers['__ROUTE__'] || Sentry.wrapGetInitialPropsWithSentry;

if (pageComponent && typeof origGetInitialProps === 'function') {
  pageComponent.getInitialProps = getInitialPropsWrapper(origGetInitialProps) ;
}

const getStaticProps =
  typeof origGetStaticProps === 'function'
    ? Sentry.wrapGetStaticPropsWithSentry(origGetStaticProps, '__ROUTE__')
    : undefined;
const getServerSideProps =
  typeof origGetServerSideProps === 'function'
    ? Sentry.wrapGetServerSidePropsWithSentry(origGetServerSideProps, '__ROUTE__')
    : undefined;

const pageWrapperTemplate = pageComponent ? Sentry.wrapPageComponentWithSentry(pageComponent ) : pageComponent;

export { pageWrapperTemplate as default, getServerSideProps, getStaticProps };
