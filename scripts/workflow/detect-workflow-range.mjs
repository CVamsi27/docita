import { execFileSync } from "node:child_process";

export function resolveRange(event, cwd) {
  const baseSha = event.pull_request?.base?.sha;
  const headSha = event.pull_request?.head?.sha;
  if (baseSha && headSha) return resolvePullRequestRange(baseSha, headSha, cwd);
  if (event.before && event.after) {
    return { baseSha: event.before, headSha: event.after };
  }
  throw new Error(
    "Unable to resolve diff range from the GitHub event payload.",
  );
}

function resolvePullRequestRange(baseSha, headSha, cwd) {
  const mergeBase = execFileSync("git", ["merge-base", baseSha, headSha], {
    cwd,
    encoding: "utf8",
  }).trim();
  if (!mergeBase) {
    throw new Error("Unable to determine merge base for pull request changes.");
  }
  return { baseSha: mergeBase, headSha };
}
