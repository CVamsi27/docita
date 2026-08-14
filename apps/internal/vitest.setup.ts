import "@testing-library/jest-dom/vitest";

// Radix Select calls item.scrollIntoView() when highlighting options; jsdom
// does not implement Element#scrollIntoView, which crashes the React tree.
// Mirrors apps/app/vitest.setup.ts.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
