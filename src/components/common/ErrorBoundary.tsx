import React from 'react';

interface State {
  error: Error | null;
}

/** Chặn lỗi render để không bị màn hình trắng toàn app. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-50">
        <p className="text-sm font-bold text-slate-800">Ứng dụng gặp lỗi hiển thị</p>
        <p className="text-xs text-slate-500 break-words max-w-xs">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Tải lại
        </button>
      </div>
    );
  }
}

