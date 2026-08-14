import "@testing-library/jest-dom";

// Pin the test timezone so date rendering is deterministic across runners:
// CI runs UTC while local dev is Asia/Calcutta, and a toLocaleString()-based
// assertion can flip (or stay) day/month between the two. Every spec now sees
// the same wall time the CI runner sees (see the #261 follow-up audit).
process.env.TZ = "UTC";

// Radix Select calls item.scrollIntoView() when highlighting options; jsdom
// does not implement Element#scrollIntoView, which crashes the React tree.
// Provide a no-op so Select interactions work in unit tests.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Radix primitives (e.g. radio groups, selects) measure layout with
// ResizeObserver, which jsdom does not implement. Provide a no-op global.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

// Components converted to react-i18next during the Vite port render `t()`
// keys as raw strings unless the module is mocked, which breaks specs that
// assert the real English copy. Register the shared en.json-backed mock
// globally so every spec resolves translations (specs that need different
// behavior can still vi.mock react-i18next locally to override it).
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test-utils/i18n-mock");
  return createI18nMock();
});
