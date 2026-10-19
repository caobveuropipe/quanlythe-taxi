import React from 'react';
import {
  Globe,
  Database,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Smartphone,
  Info,
} from 'lucide-react';

interface AdminWebPortalStandbyViewProps {
  onBackToMiniApp: () => void;
}

export const AdminWebPortalStandbyView: React.FC<AdminWebPortalStandbyViewProps> = ({
  onBackToMiniApp,
}) => {
  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {/* Top back button */}
      <button
        onClick={onBackToMiniApp}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại Telegram Mini App</span>
      </button>

      {/* Main Standby Announcement Banner */}
      <div className="p-5 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white border border-blue-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded border border-blue-400/30">
            <Globe className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-blue-300">
              Cổng chờ chuyên dụng
            </div>
            <h2 className="text-base font-bold text-white">
              Webapp quản trị đang chờ thiết kế
            </h2>
          </div>
        </div>

        <p className="text-xs text-blue-100/90 leading-relaxed">
          Đây là cổng định tuyến chuẩn bị cho phiên bản <strong>Web Admin màn hình lớn</strong>. Ở phiên bản hiện tại, <strong>toàn bộ nghiệp vụ hàng ngày của Admin đều đã được hỗ trợ đầy đủ 100% ngay bên trong Telegram Mini App</strong>, không bị thiếu sót bất kỳ tính năng cốt lõi nào.
        </p>

        <div className="pt-1 flex items-center gap-2 text-[11px] text-blue-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Không có link rỗng · Không bắt Admin chuyển tab để làm việc</span>
        </div>
      </div>

      {/* 3 Future Functional Groups Explained */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          3 nhóm chức năng dự kiến trong phiên bản Webapp riêng:
        </div>

        {/* Group 1 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Database className="w-4 h-4 text-blue-500 shrink-0" />
            <span>1. Quản lý dữ liệu số lượng lớn (Big Data & Multi-site)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Hỗ trợ quản trị hàng chục nghìn nhân sự đa chi nhánh (Hà Nội, TP.HCM, Đà Nẵng), liên kết sơ đồ tổ chức phòng ban nhiều cấp bậc, quản lý kho thẻ taxi hàng trăm thẻ vật lý theo từng thủ quỹ chi nhánh.
          </p>
        </div>

        {/* Group 2 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>2. Nhập / xuất danh sách và đối soát hóa đơn (Import/Export)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Hỗ trợ xuất bảng kê thanh toán cước taxi theo tháng ra file Excel/CSV theo chuẩn kế toán nội bộ; tích hợp import đối soát tự động với hóa đơn điện tử VAT của các hãng taxi Mai Linh, Vinasun, Grab for Business.
          </p>
        </div>

        {/* Group 3 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <BarChart3 className="w-4 h-4 text-purple-500 shrink-0" />
            <span>3. Báo cáo phân tích chuyên sâu & Dự báo ngân sách</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Bảng điều khiển trực quan (Dashboard) với biểu đồ chi phí taxi theo quý/năm, so sánh hiệu quả chi phí giữa các khối kinh doanh và dự báo ngân sách đi lại cho kỳ kế hoạch tài chính tiếp theo.
          </p>
        </div>
      </div>

      {/* Integration Continuity Statement */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span>Đảm bảo tính kế thừa và đồng bộ:</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Khi webapp quản trị hoàn thành và mở ra, toàn bộ tài khoản nhân sự, phân quyền (Admin, Leader), danh mục mã thẻ taxi và dữ liệu các lượt đi đã ghi nhận trên Mini App này sẽ <strong>dùng chung đồng bộ 100%</strong> mà không phải nhập lại hay chuyển đổi cơ sở dữ liệu.
        </p>

        <button
          onClick={onBackToMiniApp}
          className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          <span>Về lại giao diện tác nghiệp Mini App</span>
        </button>
      </div>
    </div>
  );
};
