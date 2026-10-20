// Git hooks export repository state that must not leak into temporary fixtures.
export function withoutGitEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => !name.startsWith("GIT_")),
  );
}
