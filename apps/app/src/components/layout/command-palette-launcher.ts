export function openCommandPaletteFromUi() {
  window.dispatchEvent(new Event("docita:open-command-palette"));
}
