import "@testing-library/jest-dom/vitest";

// Pin the test timezone so date rendering is deterministic across runners:
// CI runs UTC while local dev is Asia/Calcutta, and a toLocaleString()-based
// assertion can flip (or stay) day/month between the two. Every spec now sees
// the same wall time the CI runner sees (see the #261 follow-up audit).
process.env.TZ = "UTC";

// Radix Select calls item.scrollIntoView() when highlighting options; jsdom
// does not implement Element#scrollIntoView, which crashes the React tree.
// Mirrors apps/app/vitest.setup.ts.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
