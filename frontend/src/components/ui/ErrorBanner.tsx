import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function ErrorBanner({ title = 'Something went wrong', message, action }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-rose-800">{message}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
