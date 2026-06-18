export const esbuildHelperBootstrapScript = `
if (typeof globalThis.__name !== "function") {
  globalThis.__name = function(target) {
    return target;
  };
}
`;
