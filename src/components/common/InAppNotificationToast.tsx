import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink, Bell } from 'lucide-react';

export interface InAppToastMessage {
  id: string;
  title: string;
  description: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface InAppNotificationToastProps {
  notifications: InAppToastMessage[];
  onDismiss: (id: string) => void;
}

// Web Audio API Sound Chime
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Chord chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio may be blocked by browser policy before user interaction
  }
};

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  useEffect(() => {
    if (notifications.length > 0) {
      playNotificationSound();
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      } catch {}
    }
  }, [notifications.length]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3 pointer-events-none flex flex-col gap-2 transition-all duration-300">
      {notifications.map((notif) => {
        const isSuccess = notif.type === 'success' || !notif.type;
        const isWarning = notif.type === 'warning';
        const isError = notif.type === 'error';

        const bgBorder = isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
          : isWarning
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/40'
          : isError
          ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
          : 'bg-slate-900/90 border-blue-500/40 text-slate-100 shadow-slate-950/40';

        const iconColor = isSuccess
          ? 'text-emerald-400'
          : isWarning
          ? 'text-amber-400'
          : isError
          ? 'text-rose-400'
          : 'text-blue-400';

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto rounded-xl p-3 border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${bgBorder}`}
          >
            <div className={`mt-0.5 shrink-0 p-1 rounded-full bg-white/10 ${iconColor}`}>
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isWarning && <AlertCircle className="w-5 h-5" />}
              {isError && <AlertCircle className="w-5 h-5" />}
              {!isSuccess && !isWarning && !isError && <Bell className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <h4 className="text-xs font-bold leading-tight truncate">{notif.title}</h4>
                <span className="text-[10px] text-white/50 shrink-0">vừa xong</span>
              </div>
              <p className="text-[11px] leading-relaxed text-white/80 line-clamp-2">
                {notif.description}
              </p>

              {notif.actionLabel && notif.onAction && (
                <button
                  onClick={() => {
                    notif.onAction?.();
                    onDismiss(notif.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white transition-colors"
                >
                  <span>{notif.actionLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => onDismiss(notif.id)}
              className="shrink-0 p-1 text-white/50 hover:text-white rounded-lg transition-colors -mr-1 -mt-1"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
