'use client';

import type { BidSummary } from '@/lib/types';
import { fmt, fmtPct } from '@/lib/calculator';
import { TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';

interface Props {
  summary: BidSummary;
  projectName: string;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'border-t border-gray-100 mt-1 pt-2.5' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color ?? (bold ? 'text-slate-900' : 'text-slate-700')}`}>{value}</span>
    </div>
  );
}

export default function BidSummary({ summary, projectName }: Props) {
  const hasData = summary.totalRevenue > 0;

  return (
    <div className="sticky top-4 space-y-4">
      {/* Grand Total Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-5 text-white shadow-lg">
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
          {projectName || 'Unnamed Project'}
        </p>
        <p className="text-3xl font-black">{fmt(summary.totalRevenue)}</p>
        <p className="text-indigo-200 text-sm mt-1">
          {summary.totalUnitQty} units · {summary.totalCabinets} cabinets
        </p>
        {hasData && summary.grossProfitMargin > 0 && (
          <div className="mt-3 bg-indigo-500/40 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-indigo-100 text-xs">Gross Profit Margin</span>
            <span className="font-bold text-white">{fmtPct(summary.grossProfitMargin)}</span>
          </div>
        )}
      </div>

      {/* Unit Type Breakdown */}
      {summary.unitTypes.some(ut => ut.totalBuildingAmount > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <BarChart3 size={13} />
            Unit Breakdown
          </h3>
          <div className="space-y-1">
            {summary.unitTypes.map(ut => (
              ut.totalBuildingAmount > 0 && (
                <div key={ut.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-sm font-medium text-slate-700">{ut.name || `Unit ${ut.id}`}</span>
                    <span className="text-xs text-slate-400 ml-2">× {ut.quantity}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">{fmt(ut.totalBuildingAmount)}</div>
                    <div className="text-xs text-slate-400">{fmt(ut.unitTotalAmount)} / unit</div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <DollarSign size={13} />
          Revenue Breakdown
        </h3>
        <Row label="Cabinets & Trim" value={fmt(summary.cabinetRevenue)} />
        <Row label={`Build (${summary.totalCabinets} × $20)`} value={fmt(summary.buildRevenue)} />
        <Row label={`Handles (${summary.totalHandles} × $2.20)`} value={fmt(summary.handleRevenue)} />
        <Row label={`Shipping (${summary.totalUnitQty} × $90)`} value={fmt(summary.shippingRevenue)} />
        <Row label="Total Revenue" value={fmt(summary.totalRevenue)} bold />
      </div>

      {/* Cost Breakdown */}
      {hasData && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Package size={13} />
            Cost Analysis
          </h3>
          <Row label="Cabinet Cost" value={fmt(summary.cabinetCost)} />
          <Row label="Build Cost" value={fmt(summary.buildCost)} />
          <Row label="Handle Cost" value={fmt(summary.handleCost)} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-500">Shipping to AZ</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-700">{fmt(summary.shippingToAZ)}</span>
              <span className="text-xs text-slate-400 ml-1">
                ({Math.ceil(summary.totalCabinets / 800)} truck{Math.ceil(summary.totalCabinets / 800) !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-500">Shipping to Job</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-700">{fmt(summary.shippingToJob)}</span>
              <span className="text-xs text-slate-400 ml-1">
                ({Math.ceil(summary.totalCabinets / 300)} truck{Math.ceil(summary.totalCabinets / 300) !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
          <Row label="Total Cost" value={fmt(summary.totalCost)} bold />

          <div className={`mt-3 rounded-lg px-3 py-2.5 flex items-center justify-between ${summary.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${summary.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Gross Profit
              </div>
              <div className={`text-xs ${summary.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {fmtPct(summary.grossProfitMargin)} margin
              </div>
            </div>
            <span className={`text-xl font-black ${summary.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {fmt(summary.grossProfit)}
            </span>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {hasData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-lg font-black text-slate-800">{summary.totalCabinets}</div>
            <div className="text-xs text-slate-400">Cabs</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-lg font-black text-slate-800">{summary.totalHandles}</div>
            <div className="text-xs text-slate-400">Handles</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-lg font-black text-slate-800">{summary.totalTrimPieces}</div>
            <div className="text-xs text-slate-400">Trim</div>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <TrendingUp size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Add unit types with cabinets to see your bid summary here</p>
        </div>
      )}
    </div>
  );
}
