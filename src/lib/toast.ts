export type ToastTone = "info" | "success" | "error";

export const TOAST_EVENT = "mz-toast";

export function toast(message: string, tone: ToastTone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, tone } }),
  );
}
