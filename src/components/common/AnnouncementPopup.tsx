import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Clock,
  Users,
  Shield,
  User,
} from 'lucide-react';
import { AppAnnouncement } from '../../types';

interface AnnouncementPopupProps {
  announcement: AppAnnouncement;
  isOpen: boolean;
  onClose: () => void;
  durationSeconds?: number;
  previewMode?: boolean;
}

// Web Audio API Sound Chime
const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio can fail silently if not yet interacted
  }
};

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({
  announcement,
  isOpen,
  onClose,
  durationSeconds = 8,
  previewMode = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(durationSeconds);
    setIsPaused(false);
    playChimeSound();

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
    } catch {}
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, isPaused]);

  // Tự đóng khi hết giờ (không gọi setState của parent bên trong updater)
  useEffect(() => {
    if (isOpen && timeLeft <= 0) onCloseRef.current();
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const type = announcement.type || 'info';

  const typeConfigMap = {
    info: {
      gradient: 'from-blue-600 to-indigo-700',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Bell className="w-5 h-5 text-white" />,
      tagText: 'Thông báo',
      progressBg: 'bg-blue-500',
    },
    warning: {
      gradient: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      tagText: 'Lưu ý quan trọng',
      progressBg: 'bg-amber-500',
    },
    success: {
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      tagText: 'Tin mới',
      progressBg: 'bg-emerald-500',
    },
    urgent: {
      gradient: 'from-rose-600 to-red-700',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <Megaphone className="w-5 h-5 text-white" />,
      tagText: 'Khẩn cấp / Bảo trì',
      progressBg: 'bg-rose-500',
    },
  };
  // Giá trị lạ từ DB/config không được làm crash toàn app (màn hình trắng)
  const typeConfig = typeConfigMap[type as keyof typeof typeConfigMap] ?? typeConfigMap.info;

  const roleLabelMap = {
    all: {
      label: 'Tất cả người dùng',
      icon: <Users className="w-3.5 h-3.5 text-slate-500" />,
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    admin: {
      label: 'Ban Quản trị (Admin)',
      icon: <Shield className="w-3.5 h-3.5 text-blue-600" />,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    user: {
      label: 'Nhân sự / Người dùng',
      icon: <User className="w-3.5 h-3.5 text-emerald-600" />,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  };
  const roleLabel =
    roleLabelMap[(announcement.targetRole || 'all') as keyof typeof roleLabelMap] ?? roleLabelMap.all;

  const progressPercentage = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all duration-300 scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bar đếm ngược 8s */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className={`h-full ${typeConfig.progressBg} transition-all duration-1000 ease-linear`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header với Gradient & Icon */}
        <div className={`p-4 bg-gradient-to-r ${typeConfig.gradient} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 backdrop-blur-xs rounded-xl shadow-xs">
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
                  {typeConfig.tagText}
                </span>
                {previewMode && (
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded">
                    Chế độ xem trước
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base mt-0.5 drop-shadow-xs line-clamp-1">
                {announcement.title || 'Thông báo hệ thống'}
              </h3>
            </div>
          </div>

          {/* Nút Close góc trên */}
          <button
            onClick={onClose}
            aria-label="Đóng thông báo"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung thông báo */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Target Role Pill */}
          <div className="flex items-center justify-between text-xs pb-1">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${roleLabel.badge}`}>
              {roleLabel.icon}
              <span>{roleLabel.label}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isPaused ? 'Đã tạm dừng' : `Đóng sau ${timeLeft}s`}
              </span>
            </div>
          </div>

          {/* Chi tiết nội dung văn bản */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs sm:text-[13px] text-slate-700 leading-relaxed max-h-[45vh] overflow-y-auto whitespace-pre-line select-text">
            {announcement.content || 'Hiện chưa có nội dung thông báo.'}
          </div>

          {isPaused && (
            <div className="text-[10px] text-center text-slate-500 italic">
              (Đang chạm giữ / rê chuột: đếm ngược được tạm dừng để bạn đọc)
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              {announcement.updatedAt ? new Date(announcement.updatedAt).toLocaleDateString('vi-VN') : ''}
            </span>

            <button
              onClick={onClose}
              type="button"
              className="flex-1 max-w-[140px] py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <span>Đã hiểu</span>
              <span className="font-mono text-[10px] opacity-80">({timeLeft}s)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
