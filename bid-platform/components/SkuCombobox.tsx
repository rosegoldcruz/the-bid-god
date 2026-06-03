'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { CabinetStyle, BoxConstruction } from '@/lib/types';
import { getAllCatalogItems, getListPrice } from '@/lib/catalog';
import { getMarginFactor, fmt } from '@/lib/calculator';

interface Props {
  value: string;
  onChange: (sku: string) => void;
  style: CabinetStyle;
  finish: string;
  boxConstruction: BoxConstruction;
  marginPct: number;
  isAccessory?: boolean;
  placeholder?: string;
}

export default function SkuCombobox({ value, onChange, style, finish, boxConstruction, marginPct, isAccessory = false, placeholder = 'Select or type SKU...' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const all = getAllCatalogItems(style);
    return isAccessory ? all.filter(i => i.isAccessory) : all.filter(i => !i.isAccessory);
  }, [style, isAccessory]);

  const factor = getMarginFactor(style, marginPct);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 80);
    const q = query.toLowerCase();
    return items
      .filter(i => i.sku.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .slice(0, 60);
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const item of filtered) {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filtered]);

  const selectedItem = useMemo(() => items.find(i => i.sku === value), [items, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(sku: string) {
    onChange(sku);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  const listPrice = value ? getListPrice(value, style, finish, boxConstruction) : 0;
  const unitPrice = listPrice * factor;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-blue-400 focus:outline-none focus:border-blue-500 transition-colors text-left"
      >
        <span className="flex-1 truncate">
          {selectedItem ? (
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-800">{selectedItem.sku}</span>
              <span className="text-slate-500 truncate text-xs">{selectedItem.description}</span>
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && listPrice > 0 && (
            <span className="text-xs text-emerald-600 font-semibold">{fmt(unitPrice)}</span>
          )}
          {value && (
            <X
              size={14}
              className="text-slate-400 hover:text-red-500 transition-colors"
              onClick={handleClear}
            />
          )}
          <ChevronDown size={14} className="text-slate-400" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full min-w-[360px] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search SKU or description..."
              className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Items */}
          <div className="overflow-y-auto max-h-72">
            {Object.keys(grouped).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No matching items</p>
            ) : (
              Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                    {cat}
                  </div>
                  {catItems.map(item => {
                    const lp = getListPrice(item.sku, style, finish, boxConstruction);
                    const up = lp * factor;
                    return (
                      <button
                        key={item.sku}
                        type="button"
                        onClick={() => handleSelect(item.sku)}
                        className={`w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left transition-colors ${value === item.sku ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-700 w-20 flex-shrink-0">{item.sku}</span>
                          <span className="text-xs text-slate-600 truncate">{item.description}</span>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0 ml-2">
                          <span className="text-xs font-semibold text-emerald-600">{lp > 0 ? fmt(up) : '—'}</span>
                          {lp > 0 && <span className="text-xs text-slate-400">list {fmt(lp)}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-1.5 text-xs text-slate-400 bg-gray-50 border-t border-gray-100">
            {filtered.length} items shown · type to search
          </div>
        </div>
      )}
    </div>
  );
}
