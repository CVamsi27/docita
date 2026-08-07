import { isMessageTree, type MessageTree } from "@/i18n/locale-utils";

const enModules = import.meta.glob("./en/*.json", {
  eager: true,
  import: "default",
});
const hiModules = import.meta.glob("./hi/*.json", {
  eager: true,
  import: "default",
});

/**
 * Merge per-namespace message files back into the full tree. File names equal
 * the top-level namespace keys (`en/Auth.json` -> `Auth`), so the merge key is
 * the namespace. The merged tree is identical to the historical single
 * en.json/hi.json bundle — buildResources walks object children and registers
 * the same namespaces either way.
 */
function mergeFiles(files: Record<string, unknown>): MessageTree {
  const tree: Record<string, unknown> = {};
  for (const [filePath, value] of Object.entries(files)) {
    const ns = filePath.split("/").pop()?.replace(/\.json$/, "") ?? "";
    tree[ns] = value;
  }
  return isMessageTree(tree) ? tree : {};
}

export const enMessages = mergeFiles(enModules);
export const hiMessages = mergeFiles(hiModules);
