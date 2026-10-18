import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Smartphone,
  Maximize2,
  Moon,
  Sun,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

export const PreviewToolbar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    config,
    updateConfig,
    activeViewMode,
    setActiveViewMode,
    isDarkMode,
    toggleDarkMode,
    resetAllData,
    runScenario,
    supabaseStatus,
  } = useApp();

  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'employee':
        return 'Nhân sự';
      case 'leader':
        return 'Leader duyệt';
      case 'admin':
        return 'Admin';
      case 'hr':
        return 'HR vận hành';
      case 'admin_hr':
        return 'Admin kiêm HR (Toàn quyền)';
      default:
        return role;
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-100 text-xs py-2 px-3 sm:px-6 shadow-sm select-none z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Environment Badge & Role Switcher */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold tracking-wide uppercase text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Chỉ dùng để xem thử</span>
          </div>

          {supabaseStatus === 'connected' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Supabase Cloud (Seoul)</span>
            </div>
          ) : supabaseStatus === 'connecting' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Đang kết nối Supabase...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 font-semibold text-[11px]">
              <span>Local Storage</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Đổi vai trò:</span>
            <select
              aria-label="Chọn vai trò người dùng"
              value={currentUser.id}
              onChange={(e) => {
                const selected = users.find((u) => u.id === e.target.value);
                if (selected) setCurrentUser(selected);
              }}
              className="bg-slate-800 border border-slate-700 text-white py-1 px-2.5 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {getRoleLabel(u.role)} ({u.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Middle: Fast Scenarios */}
        <div className="relative">
          <button
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Kịch bản thử nghiệm nhanh</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showScenarioMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-slate-900 border border-slate-700 shadow-xl p-2 z-50 space-y-1">
              <div className="text-[11px] text-slate-400 px-2 py-1 font-semibold uppercase tracking-wider">
                Chọn tình huống nghiệp vụ:
              </div>

              <button
                onClick={() => {
                  runScenario('scenario_leader_flow');
                  setShowScenarioMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <div className="font-semibold text-xs text-blue-300">1. Luồng Leader duyệt bật</div>
                <div className="text-[11px] text-slate-400">Đổi sang Nhân sự A; yêu cầu cần Leader duyệt rồi mới tới Admin.</div>
              </button>

              <button
                onClick={() => {
                  runScenario('scenario_out_of_cards');
                  setShowScenarioMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <div className="font-semibold text-xs text-amber-300">2. Hết thẻ kho & Danh sách chờ</div>
                <div className="text-[11px] text-slate-400">Khóa sẵn các thẻ; xem cách yêu cầu vào danh sách chờ để Admin chọn cấp.</div>
              </button>

              <button
                onClick={() => {
                  runScenario('scenario_holding_return');
                  setShowScenarioMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <div className="font-semibold text-xs text-emerald-300">3. Trả thẻ & Nhập bill / OCR</div>
                <div className="text-[11px] text-slate-400">Vào Admin/HR để thu hồi thẻ TAXI-03 của NV-1024, thử OCR gợi ý từ ảnh.</div>
              </button>

              <button
                onClick={() => {
                  runScenario('scenario_overbudget_review');
                  setShowScenarioMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <div className="font-semibold text-xs text-rose-300">4. Duyệt chi vượt mức (780k/500k)</div>
                <div className="text-[11px] text-slate-400">Xem lượt vượt mức REQ-2026-095 để HR ấn Accept hoặc Reject kèm lý do.</div>
              </button>
            </div>
          )}
        </div>

        {/* Right: Controls (Viewport, Theme, Reset, Notice) */}
        <div className="flex items-center gap-2">
          {/* Viewport switch */}
          <div className="flex items-center bg-slate-800 border border-slate-700 p-0.5">
            <button
              onClick={() => setActiveViewMode('mobile')}
              title="Khung chuẩn Telegram Mobile (390px)"
              className={`p-1 flex items-center gap-1 ${
                activeViewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khung 390px</span>
            </button>
            <button
              onClick={() => setActiveViewMode('responsive')}
              title="Toàn màn hình responsive"
              className={`p-1 flex items-center gap-1 ${
                activeViewMode === 'responsive' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở rộng</span>
            </button>
          </div>

          {/* Dark mode */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              if (window.confirm('Đặt lại toàn bộ dữ liệu demo về trạng thái ban đầu?')) {
                resetAllData();
              }
            }}
            title="Đặt lại dữ liệu ban đầu"
            className="flex items-center gap-1 p-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Đặt lại demo</span>
          </button>
        </div>
      </div>

      {/* Mandatory Demo Disclaimer Line */}
      <div className="max-w-7xl mx-auto mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            Dữ liệu demo mô phỏng cục bộ. Chưa kết nối Telegram Bot, Google Sheets hoặc OCR thật.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>Bước Leader duyệt hiện tại: <strong className={config.requireLeaderApproval ? 'text-emerald-400' : 'text-slate-400'}>{config.requireLeaderApproval ? 'BẬT' : 'TẮT'}</strong></span>
          <span>Mức tối đa/lượt: <strong className="text-amber-400 tabular-nums">{config.maxSpendPerTrip.toLocaleString('vi-VN')} đ</strong></span>
        </div>
      </div>
    </div>
  );
};
