import { toast } from "sonner";
import type { GlobalShortcutContext } from "./global-shortcut-types";

type RouterPush = { push: (href: string) => void };

export function handleModifiedGlobalShortcut(params: {
  event: KeyboardEvent;
  router: RouterPush;
  isInConsultation: boolean;
  context: GlobalShortcutContext | undefined;
}): boolean {
  switch (params.event.key.toLowerCase()) {
    case "q":
      params.event.preventDefault();
      params.router.push("/consultation");
      return true;
    case "s":
      return runConsultationAction(
        params,
        params.context?.onSaveConsultation,
        true,
      );
    case "enter":
      return runConsultationAction(
        params,
        params.context?.onCompleteConsultation,
      );
    case "]":
      return runConsultationAction(params, params.context?.onNextTab);
    case "[":
      return runConsultationAction(params, params.context?.onPrevTab);
    default:
      return false;
  }
}

export function handlePlainGlobalShortcut(params: {
  event: KeyboardEvent;
  isOnQueue: boolean;
  isOnDashboard: boolean;
}): boolean {
  switch (params.event.key.toLowerCase()) {
    case "n":
      return dispatchQueueEvent(
        params.event,
        params.isOnQueue || params.isOnDashboard,
        "docita:next-patient",
      );
    case "r":
      return dispatchQueueEvent(
        params.event,
        params.isOnQueue,
        "docita:refresh-queue",
      );
    default:
      return false;
  }
}

function runConsultationAction(
  params: { event: KeyboardEvent; isInConsultation: boolean },
  action: (() => void) | undefined,
  showSavedToast = false,
): boolean {
  if (!params.isInConsultation || !action) return false;
  params.event.preventDefault();
  action();
  if (showSavedToast) toast.success("Consultation saved", { duration: 2000 });
  return true;
}

function dispatchQueueEvent(
  event: KeyboardEvent,
  enabled: boolean,
  eventName: string,
): boolean {
  if (!enabled) return false;
  event.preventDefault();
  window.dispatchEvent(new CustomEvent(eventName));
  return true;
}
