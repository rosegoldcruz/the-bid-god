'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, Save, Send, Building2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BidState, UnitType, CabinetStyle, BoxConstruction } from '@/lib/types';
import { getFinishesForStyle } from '@/lib/catalog';
import { computeBidSummary, MARGIN_OPTIONS } from '@/lib/calculator';
import UnitTypeCard from './UnitTypeCard';
import BidSummary from './BidSummary';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_STATE: BidState = {
  projectName: '',
  cabinetStyle: 'Frameless',
  cabinetFinish: 'Natural Oak',
  boxConstruction: 'Plywood',
  priceMarginLabel: 'Purchase Price (0%)',
  priceMarginPct: 0,
  unitTypes: [],
};

export default function BidBuilder() {
  const [state, setState] = useState<BidState>(DEFAULT_STATE);

  const summary = useMemo(() => computeBidSummary(state), [state]);

  const finishes = useMemo(() => getFinishesForStyle(state.cabinetStyle), [state.cabinetStyle]);

  function updateState<K extends keyof BidState>(field: K, value: BidState[K]) {
    setState(prev => ({ ...prev, [field]: value }));
  }

  function handleStyleChange(style: CabinetStyle) {
    const newFinishes = getFinishesForStyle(style);
    setState(prev => ({
      ...prev,
      cabinetStyle: style,
      cabinetFinish: newFinishes[0],
      boxConstruction: style === 'Frameless' ? prev.boxConstruction : 'Plywood',
    }));
  }

  function handleMarginChange(label: string) {
    const opt = MARGIN_OPTIONS.find(o => o.label === label);
    if (opt) {
      setState(prev => ({ ...prev, priceMarginLabel: opt.label, priceMarginPct: opt.pct }));
    }
  }

  function addUnitType() {
    const newUt: UnitType = {
      id: genId(),
      name: `Unit Type ${state.unitTypes.length + 1}`,
      quantity: 1,
      cabinets: [],
      accessories: [],
    };
    setState(prev => ({ ...prev, unitTypes: [...prev.unitTypes, newUt] }));
    toast.success('Unit type added');
  }

  function updateUnitType(id: string, updated: UnitType) {
    setState(prev => ({
      ...prev,
      unitTypes: prev.unitTypes.map(ut => ut.id === id ? updated : ut),
    }));
  }

  function deleteUnitType(id: string) {
    setState(prev => ({ ...prev, unitTypes: prev.unitTypes.filter(ut => ut.id !== id) }));
    toast('Unit type removed', { icon: '🗑️' });
  }

  function handleSave() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.projectName || 'bid'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bid saved!');
  }

  function handleReset() {
    if (confirm('Reset the entire bid? This cannot be undone.')) {
      setState(DEFAULT_STATE);
      toast('Bid reset', { icon: '🔄' });
    }
  }

  function handleSubmit() {
    if (!state.projectName.trim()) {
      toast.error('Please enter a project name first');
      return;
    }
    if (state.unitTypes.length === 0 || summary.totalRevenue === 0) {
      toast.error('Please add at least one unit type with cabinets');
      return;
    }
    toast.success(`Bid submitted! Total: $${summary.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, { duration: 5000 });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-[#0a1628] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#d4a017] rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium tracking-widest uppercase">Vulpine</div>
              <div className="text-sm font-bold leading-tight">Bid Platform</div>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={state.projectName}
              onChange={e => updateState('projectName', e.target.value)}
              placeholder="Project Name..."
              className="w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:border-[#d4a017] focus:bg-white/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors border border-white/20"
            >
              <Save size={13} />
              Save
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d4a017] hover:bg-[#e6b020] text-white text-xs font-bold rounded-lg transition-colors shadow-md"
            >
              <Send size={13} />
              Submit Bid
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Project Settings Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Cabinet Style</label>
              <div className="flex gap-1">
                {(['Framed', 'Frameless'] as CabinetStyle[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStyleChange(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${state.cabinetStyle === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Cabinet Finish</label>
              <div className="relative">
                <select
                  value={state.cabinetFinish}
                  onChange={e => updateState('cabinetFinish', e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400 pr-8"
                >
                  {finishes.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {state.cabinetStyle === 'Frameless' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Box Construction</label>
                <div className="flex gap-1">
                  {(['Plywood', 'PB w/ Wood Drawers', 'PB w/ PB Drawers'] as BoxConstruction[]).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => updateState('boxConstruction', b)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${state.boxConstruction === b ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}
                    >
                      {b === 'Plywood' ? 'Plywood' : b === 'PB w/ Wood Drawers' ? 'PB + Wood Drawers' : 'PB + PB Drawers'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="min-w-[200px]">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Price Margin</label>
              <div className="relative">
                <select
                  value={state.priceMarginLabel}
                  onChange={e => handleMarginChange(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400 pr-8"
                >
                  {MARGIN_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {summary.totalRevenue > 0 && (
              <div className="ml-auto bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-right">
                <div className="text-xs text-indigo-400 font-medium">Running Total</div>
                <div className="text-lg font-black text-indigo-700">${summary.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              </div>
            )}
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="flex gap-6 items-start">
          {/* Left: Unit Types */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Unit Types</h2>
                <p className="text-sm text-slate-400">
                  {state.unitTypes.length > 0
                    ? `${state.unitTypes.length} type${state.unitTypes.length !== 1 ? 's' : ''} · ${summary.totalUnitQty} total units`
                    : 'Add unit types to start building your bid'}
                </p>
              </div>
              <button
                type="button"
                onClick={addUnitType}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors"
              >
                <Plus size={16} />
                Add Unit Type
              </button>
            </div>

            {state.unitTypes.length === 0 && (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                <Building2 size={40} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No unit types yet</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                  Click "Add Unit Type" to start. You can add up to 50 different unit types — each with their own cabinet and trim selections.
                </p>
                <button
                  type="button"
                  onClick={addUnitType}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors mx-auto"
                >
                  <Plus size={16} />
                  Add First Unit Type
                </button>
              </div>
            )}

            {state.unitTypes.map((ut, idx) => (
              <UnitTypeCard
                key={ut.id}
                unitType={ut}
                computed={summary.unitTypes.find(u => u.id === ut.id)}
                state={state}
                onUpdate={updated => updateUnitType(ut.id, updated)}
                onDelete={() => deleteUnitType(ut.id)}
                unitIndex={idx}
              />
            ))}

            {state.unitTypes.length > 0 && (
              <button
                type="button"
                onClick={addUnitType}
                className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-gray-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-300 font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Another Unit Type
              </button>
            )}
          </div>

          {/* Right: Summary Sidebar */}
          <div className="w-80 flex-shrink-0">
            <BidSummary summary={summary} projectName={state.projectName} />
          </div>
        </div>
      </div>
    </div>
  );
}
