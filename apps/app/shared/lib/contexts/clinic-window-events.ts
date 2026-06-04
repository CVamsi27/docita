export function subscribeToWindowFocus(callback: () => void) {
  const handleFocus = () => callback();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") callback();
  };
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
