import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest, UserProfile } from '../../types';
import {
  Calendar,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface EmployeeReportSummary {
  employeeId: string;
  name: string;
  code: string;
  department: string;
  tripsCount: number;
  tripsWithBillCount: number;
  tripsMissingBillCount: number;
  totalActualCost: number;
  overBudgetTripsCount: number;
  requests: TaxiRequest[];
}

export const AdminReportsView: React.FC = () => {
  const { requests, users } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // YYYY-MM
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = nhiều nhất, 'asc' = ít nhất
  const [selectedEmployeeSummary, setSelectedEmployeeSummary] = useState<EmployeeReportSummary | null>(null);

  // Available months from requests
  const months = [
    { key: '2026-10', label: 'Tháng 10 / 2026' },
    { key: '2026-09', label: 'Tháng 09 / 2026' },
  ];

  // Available departments
  const departments = ['Tất cả bộ phận', 'Phòng Kinh Doanh', 'Phòng Marketing', 'Ban Quản Trị & Vận Hành'];

  // Aggregate by employee for selected month & department
  const employeeSummaries: EmployeeReportSummary[] = users
    .filter((u) => u.role === 'employee' || requests.some((r) => r.employeeId === u.id))
    .map((user) => {
      // Find all requests in selected month for this user
      const userMonthReqs = requests.filter((r) => {
        if (r.employeeId !== user.id) return false;
        if (selectedDept !== 'all' && selectedDept !== 'Tất cả bộ phận' && r.department !== selectedDept) return false;

        const reqDate = r.createdAt.substring(0, 7); // '2026-10'
        return reqDate === selectedMonth;
      });

      let tripsWithBill = 0;
      let tripsMissingBill = 0;
      let totalCost = 0;
      let overBudgetCount = 0;

      userMonthReqs.forEach((r) => {
        if (r.tripDetails) {
          if (r.tripDetails.isCostMissing || r.tripDetails.actualCost === null) {
            tripsMissingBill += 1;
          } else {
            tripsWithBill += 1;
            // CRITICAL RULE: "Chi phí vượt bị Reject vẫn được nhận diện trong số thực tế, kèm trạng thái xử lý."
            totalCost += r.tripDetails.actualCost || 0;
            if (r.tripDetails.isOverBudget) {
              overBudgetCount += 1;
            }
          }
        }
      });

      return {
        employeeId: user.id,
        name: user.name,
        code: user.code,
        department: user.department,
        tripsCount: userMonthReqs.length,
        tripsWithBillCount: tripsWithBill,
        tripsMissingBillCount: tripsMissingBill,
        totalActualCost: totalCost,
        overBudgetTripsCount: overBudgetCount,
        requests: userMonthReqs,
      };
    })
    .filter((s) => {
      if (selectedDept !== 'all' && selectedDept !== 'Tất cả bộ phận') {
        return s.department === selectedDept;
      }
      return true;
    });

  // Sort by totalActualCost
  const sortedSummaries = [...employeeSummaries].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.totalActualCost - a.totalActualCost;
    } else {
      return a.totalActualCost - b.totalActualCost;
    }
  });

  const grandTotalCost = sortedSummaries.reduce((sum, s) => sum + s.totalActualCost, 0);
  const grandTotalTripsWithBill = sortedSummaries.reduce((sum, s) => sum + s.tripsWithBillCount, 0);

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Báo cáo chi phí taxi theo tháng
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tổng hợp chi phí thực tế theo nhân sự · Ai dùng nhiều, ai dùng ít
          </p>
        </div>
      </div>

      {/* Month & Department Filters */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Kỳ báo cáo</span>
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
          >
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>Bộ phận</span>
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          >
            {departments.map((d) => (
              <option key={d} value={d === 'Tất cả bộ phận' ? 'all' : d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Total Overview Banner */}
      <div className="p-3 bg-slate-900 text-white dark:bg-slate-800 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Tổng cước thực tế toàn bộ {selectedMonth === '2026-10' ? 'Tháng 10' : 'Tháng 9'}
          </span>
          <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
            {grandTotalCost.toLocaleString('vi-VN')} đ
          </div>
        </div>
        <div className="text-right text-xs text-slate-300">
          <div>{grandTotalTripsWithBill} lượt có hóa đơn</div>
          <div className="text-[10px] text-slate-400">{sortedSummaries.length} nhân sự tham gia</div>
        </div>
      </div>

      {/* Sorting bar */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-500 text-[11px]">
          Danh sách nhân sự ({sortedSummaries.length}):
        </span>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
        >
          {sortOrder === 'desc' ? (
            <>
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Sắp xếp: Chi phí nhiều nhất</span>
            </>
          ) : (
            <>
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Sắp xếp: Chi phí ít nhất</span>
            </>
          )}
        </button>
      </div>

      {/* Employee List */}
      <div className="space-y-2">
        {sortedSummaries.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            Không có dữ liệu lượt đi nào trong kỳ này.
          </div>
        ) : (
          sortedSummaries.map((emp, idx) => (
            <button
              key={emp.employeeId}
              onClick={() => setSelectedEmployeeSummary(emp)}
              className="w-full text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-2xs group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <span>{emp.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({emp.code})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {emp.department} · {emp.tripsWithBillCount} lượt có bill
                      {emp.tripsMissingBillCount > 0 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                          ({emp.tripsMissingBillCount} thiếu bill)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {emp.totalActualCost.toLocaleString('vi-VN')} đ
                  </div>
                  {emp.overBudgetTripsCount > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      {emp.overBudgetTripsCount} lượt vượt mức
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail Drawer / Modal for an Employee */}
      {selectedEmployeeSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400">
                  Chi tiết các lượt sử dụng · {selectedMonth}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedEmployeeSummary.name} ({selectedEmployeeSummary.code})
                </h3>
                <div className="text-[11px] text-slate-500">
                  {selectedEmployeeSummary.department}
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeSummary(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total spend for this person */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Tổng chi phí thực tế:</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedEmployeeSummary.totalActualCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>Số lượt có bill: <strong>{selectedEmployeeSummary.tripsWithBillCount}</strong></div>
                {selectedEmployeeSummary.tripsMissingBillCount > 0 && (
                  <div className="text-amber-600 font-semibold">
                    Số lượt thiếu bill: {selectedEmployeeSummary.tripsMissingBillCount}
                  </div>
                )}
              </div>
            </div>

            {/* List of trips */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                Từng lượt mượn thẻ trong tháng:
              </div>

              {selectedEmployeeSummary.requests.map((r) => {
                const trip = r.tripDetails;
                return (
                  <div
                    key={r.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {r.purpose}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{r.destination}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[10px] text-slate-400 block">{r.id}</span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          Thẻ: {r.actualCardCode || r.reservedCardCode || 'Chưa gán'}
                        </span>
                      </div>
                    </div>

                    {/* Cost & Over-budget Status */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      {trip ? (
                        trip.isCostMissing || trip.actualCost === null ? (
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Thiếu dữ liệu hóa đơn</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {trip.actualCost.toLocaleString('vi-VN')} đ
                            </div>
                            {trip.receiptNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                HĐ: {trip.receiptNumber}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400 italic">Chưa phát sinh chi phí</span>
                      )}

                      {/* Status / HR Decision Label */}
                      {trip?.isOverBudget && (
                        <div className="text-right space-y-0.5">
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            Vượt định mức (+{trip.overBudgetAmount.toLocaleString('vi-VN')} đ)
                          </div>
                          {trip.hrOverBudgetDecision === 'accepted' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              HR đã Accept: "{trip.hrDecisionReason}"
                            </span>
                          )}
                          {trip.hrOverBudgetDecision === 'rejected' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                              HR đã Reject: "{trip.hrDecisionReason}"
                            </span>
                          )}
                          {trip.hrOverBudgetDecision === 'pending' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                              Chờ HR thẩm định
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedEmployeeSummary(null)}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-medium text-xs"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
