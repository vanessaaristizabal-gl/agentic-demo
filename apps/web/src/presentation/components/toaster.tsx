import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { dismissToast, type Toast } from '@/store/slices/ui-slice';

const ICONS = {
  success: CheckCircle2,
  error: TriangleAlert,
  default: Info,
} as const;

function ToastCard({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), 9000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-card p-3 shadow-lg animate-in slide-in-from-bottom-2',
        toast.variant === 'error' && 'border-destructive/40',
        toast.variant === 'success' && 'border-emerald-300 dark:border-emerald-900',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          toast.variant === 'error' && 'text-destructive',
          toast.variant === 'success' && 'text-emerald-600',
          toast.variant === 'default' && 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t(toast.title.key, toast.title.params)}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t(toast.description.key, toast.description.params)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.ui.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
