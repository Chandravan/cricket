import type { AppNotification } from "@/lib/auction/types";

type ToastStackProps = {
  toasts: AppNotification[];
};

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,92vw)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={`toast-${toast.id}`}
          className="pointer-events-auto rounded-xl border border-rose-300/50 bg-rose-700/80 p-3 text-sm text-rose-50 shadow-xl backdrop-blur"
        >
          <p className="font-semibold">{toast.title}</p>
          <p>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
