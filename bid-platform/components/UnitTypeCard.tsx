'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { UnitType, BidState, ComputedUnitType } from '@/lib/types';
import { fmt } from '@/lib/calculator';
import SkuCombobox from './SkuCombobox';

interface Props {
  unitType: UnitType;
  computed: ComputedUnitType | undefined;
  state: BidState;
  onUpdate: (updated: UnitType) => void;
  onDelete: () => void;
  unitIndex: number;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function UnitTypeCard({ unitType, computed, state, onUpdate, onDelete, unitIndex }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  function updateField<K extends keyof UnitType>(field: K, value: UnitType[K]) {
    onUpdate({ ...unitType, [field]: value });
  }

  function addCabinet() {
    onUpdate({ ...unitType, cabinets: [...unitType.cabinets, { id: genId(), sku: '', quantity: 1 }] });
  }

  function removeCabinet(id: string) {
    onUpdate({ ...unitType, cabinets: unitType.cabinets.filter(c => c.id !== id) });
  }

  function setCabinetSku(id: string, sku: string) {
    onUpdate({ ...unitType, cabinets: unitType.cabinets.map(c => c.id === id ? { ...c, sku } : c) });
  }

  function setCabinetQty(id: string, quantity: number) {
    onUpdate({ ...unitType, cabinets: unitType.cabinets.map(c => c.id === id ? { ...c, quantity } : c) });
  }

  function addAccessory() {
    onUpdate({ ...unitType, accessories: [...unitType.accessories, { id: genId(), sku: '', quantity: 1 }] });
  }

  function removeAccessory(id: string) {
    onUpdate({ ...unitType, accessories: unitType.accessories.filter(a => a.id !== id) });
  }

  function setAccessorySku(id: string, sku: string) {
    onUpdate({ ...unitType, accessories: unitType.accessories.map(a => a.id === id ? { ...a, sku } : a) });
  }

  function setAccessoryQty(id: string, quantity: number) {
    onUpdate({ ...unitType, accessories: unitType.accessories.map(a => a.id === id ? { ...a, quantity } : a) });
  }

  const unitTotal = computed?.unitTotalAmount ?? 0;
  const buildingTotal = computed?.totalBuildingAmount ?? 0;
  const cabinetCount = computed?.unitTotalCabinets ?? 0;
  const handles = computed?.unitHandles ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex-shrink-0">
          {unitIndex + 1}
        </div>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <input
            type="text"
            value={unitType.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="Unit Type Name (e.g. 1BR, Studio, 2BR+Den)"
            className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-base flex-1 min-w-0 py-0.5 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-indigo-600 font-medium">QTY</span>
            <input
              type="number"
              min={0}
              value={unitType.quantity}
              onChange={e => updateField('quantity', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 text-center font-bold text-indigo-700 bg-transparent focus:outline-none text-sm"
            />
          </div>

          {buildingTotal > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-400">unit price</div>
              <div className="font-semibold text-slate-800 text-sm">{fmt(unitTotal)}</div>
              <div className="text-xs text-emerald-600 font-semibold">× {unitType.quantity} = {fmt(buildingTotal)}</div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      {!collapsed && (
        <div className="p-5 space-y-5">
          {/* Cabinets Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cabinets
                {cabinetCount > 0 && (
                  <span className="ml-2 text-indigo-600 normal-case font-semibold text-xs">
                    {cabinetCount} pc · {handles} handles
                  </span>
                )}
              </h4>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              {unitType.cabinets.length > 0 && (
                <div className="grid items-center gap-2 px-2 text-xs text-slate-400 font-medium" style={{ gridTemplateColumns: '1fr 80px 80px 80px' }}>
                  <span>SKU / Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit $</span>
                  <span className="text-right">Total</span>
                </div>
              )}

              {unitType.cabinets.map((cab) => {
                const computedLine = computed?.cabinets.find(c => c.id === cab.id);
                return (
                  <div key={cab.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 72px 90px 90px auto' }}>
                    <SkuCombobox
                      value={cab.sku}
                      onChange={sku => setCabinetSku(cab.id, sku)}
                      style={state.cabinetStyle}
                      finish={state.cabinetFinish}
                      boxConstruction={state.boxConstruction}
                      marginPct={state.priceMarginPct}
                      isAccessory={false}
                    />
                    <input
                      type="number"
                      min={1}
                      value={cab.quantity}
                      onChange={e => setCabinetQty(cab.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center py-2 px-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-700 font-bold focus:outline-none focus:border-indigo-400"
                    />
                    <div className="text-right py-2 text-sm font-semibold text-slate-700 px-1">
                      {computedLine && computedLine.unitPrice > 0 ? fmt(computedLine.unitPrice) : '—'}
                    </div>
                    <div className="text-right py-2 text-sm font-bold text-emerald-600 px-1">
                      {computedLine && computedLine.lineAmount > 0 ? fmt(computedLine.lineAmount) : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCabinet(cab.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCabinet}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium py-1.5 px-2 rounded-lg hover:bg-indigo-50 transition-colors w-full"
              >
                <Plus size={15} />
                Add Cabinet
              </button>
            </div>
          </div>

          {/* Accessories/Trim Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Accessories & Trim
                {(computed?.unitTotalTrim ?? 0) > 0 && (
                  <span className="ml-2 text-purple-600 normal-case font-semibold text-xs">
                    {computed?.unitTotalTrim} pc
                  </span>
                )}
              </h4>
            </div>

            <div className="space-y-2">
              {unitType.accessories.length > 0 && (
                <div className="grid items-center gap-2 px-2 text-xs text-slate-400 font-medium" style={{ gridTemplateColumns: '1fr 80px 80px 80px' }}>
                  <span>SKU / Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit $</span>
                  <span className="text-right">Total</span>
                </div>
              )}

              {unitType.accessories.map((acc) => {
                const computedLine = computed?.accessories.find(a => a.id === acc.id);
                return (
                  <div key={acc.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 72px 90px 90px auto' }}>
                    <SkuCombobox
                      value={acc.sku}
                      onChange={sku => setAccessorySku(acc.id, sku)}
                      style={state.cabinetStyle}
                      finish={state.cabinetFinish}
                      boxConstruction={state.boxConstruction}
                      marginPct={state.priceMarginPct}
                      isAccessory={true}
                    />
                    <input
                      type="number"
                      min={1}
                      value={acc.quantity}
                      onChange={e => setAccessoryQty(acc.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center py-2 px-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-700 font-bold focus:outline-none focus:border-purple-400"
                    />
                    <div className="text-right py-2 text-sm font-semibold text-slate-700 px-1">
                      {computedLine && computedLine.unitPrice > 0 ? fmt(computedLine.unitPrice) : '—'}
                    </div>
                    <div className="text-right py-2 text-sm font-bold text-purple-600 px-1">
                      {computedLine && computedLine.lineAmount > 0 ? fmt(computedLine.lineAmount) : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAccessory(acc.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addAccessory}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium py-1.5 px-2 rounded-lg hover:bg-purple-50 transition-colors w-full"
              >
                <Plus size={15} />
                Add Accessory / Trim
              </button>
            </div>
          </div>

          {/* Unit Totals */}
          {unitTotal > 0 && (
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {cabinetCount} cabinet{cabinetCount !== 1 ? 's' : ''} · {handles} handle{handles !== 1 ? 's' : ''} · {computed?.unitTotalTrim ?? 0} trim pc
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Per unit</div>
                <div className="font-bold text-lg text-slate-800">{fmt(unitTotal)}</div>
                {unitType.quantity > 1 && (
                  <div className="text-sm font-semibold text-emerald-600">× {unitType.quantity} units = {fmt(buildingTotal)}</div>
                )}
              </div>
            </div>
          )}

          {/* Spec footer */}
          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            A. Door: HDF · B. Box: {state.boxConstruction} · C. Shelves: Plywood · D. Hinge: DTC soft close · E. Drawer: Solid Wood Dovetailed undermount softclose
          </div>
        </div>
      )}
    </div>
  );
}
