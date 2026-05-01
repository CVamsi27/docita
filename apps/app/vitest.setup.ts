import "@testing-library/jest-dom/vitest";

// api-client uses relative API paths; buildURL() requires an absolute base in Node.
if (!process.env["NEXT_PUBLIC_API_URL"]) {
  process.env["NEXT_PUBLIC_API_URL"] = "http://127.0.0.1:3001/api/v1";
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
