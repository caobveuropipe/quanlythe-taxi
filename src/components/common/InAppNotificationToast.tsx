import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink, Bell } from 'lucide-react';

export interface InAppToastMessage {
  id: string;
  title: string;
  description?: string;
  message?: string;
  roleTarget?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp?: number;
  actionLabel?: string;
  onAction?: () => void;
  destination?: 'admin_actions' | 'admin_user_approvals' | 'leader_approvals' | 'my_requests';
  requestId?: string;
}

interface InAppNotificationToastProps {
  notifications: InAppToastMessage[];
  onDismiss: (id: string) => void;
  onOpen: (notification: InAppToastMessage) => void;
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
  onOpen,
}) => {
  const soundedIds = useRef<Set<string>>(new Set());
  const latestId = notifications[0]?.id;
  const notificationIds = notifications.map((notification) => notification.id).join(',');

  useEffect(() => {
    if (latestId && !soundedIds.current.has(latestId)) {
      soundedIds.current.add(latestId);
      playNotificationSound();
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      } catch {}
    }
  }, [latestId]);

  useEffect(() => {
    const timers = notifications.map((notification) =>
      window.setTimeout(() => onDismiss(notification.id), 10000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [notificationIds, onDismiss]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3 pointer-events-none flex flex-col gap-2 transition-all duration-300">
      {notifications.map((notif) => {
        const isSuccess = notif.type === 'success' || !notif.type;
        const isWarning = notif.type === 'warning';
        const isError = notif.type === 'error';

        const bgBorder = isSuccess
          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-900/10'
          : isWarning
          ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-900/10'
          : isError
          ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-rose-900/10'
          : 'bg-white border-blue-200 text-slate-800 shadow-slate-900/10';

        const iconColor = isSuccess
          ? 'text-emerald-600'
          : isWarning
          ? 'text-amber-600'
          : isError
          ? 'text-rose-600'
          : 'text-blue-600';

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto rounded-xl p-3 border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${bgBorder}`}
          >
            <button
              type="button"
              disabled={!notif.destination}
              onClick={() => {
                onOpen(notif);
                onDismiss(notif.id);
              }}
              className={`flex flex-1 min-w-0 items-start gap-3 text-left ${notif.destination ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={notif.destination ? `Mở việc cần xử lý: ${notif.title}` : undefined}
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
                <span className="text-[10px] opacity-60 shrink-0">vừa xong</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90 line-clamp-2">
                {notif.description || notif.message}
              </p>
              {notif.destination && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold underline">Chạm để mở <ExternalLink className="w-3 h-3" /></span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onDismiss(notif.id)}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-black/10 rounded-lg transition-colors -mr-1 -mt-1"
              title="Đóng thông báo"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
