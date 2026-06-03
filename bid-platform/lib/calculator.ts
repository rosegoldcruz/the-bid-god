import type { BidState, BidSummary, ComputedLineItem, ComputedUnitType, CabinetStyle } from './types';
import { getListPrice, getHandleCount, lookupItem } from './catalog';

// Pricing constants — never touch these
const HANDLE_PRICE_PER_UNIT = 2.20;
const HANDLE_MARKUP = 0.70;
const HANDLE_COST_PER_UNIT = HANDLE_PRICE_PER_UNIT - HANDLE_MARKUP; // $1.50
const BUILD_COST_PER_BOX = 20;
const SHIPPING_PER_UNIT = 90;
const COST_PER_TRUCK_TO_AZ = 2800;
const COST_PER_TRUCK_TO_JOB = 1200;
const CABS_PER_TRUCK_TO_AZ = 800;
const CABS_PER_TRUCK_TO_JOB = 300;
const FRAMED_BASE_FACTOR = 0.185;
const FRAMELESS_BASE_FACTOR = 0.18;

export const MARGIN_OPTIONS = [
  { label: 'Purchase Price (0%)', pct: 0 },
  ...Array.from({ length: 50 }, (_, i) => ({
    label: `${i + 1}%`,
    pct: (i + 1) / 100,
  })),
];

// Factor formula: Framed = 0.185 × (0.90 + margin%), Frameless = 0.18 × (0.70 + margin%)
export function getMarginFactor(style: CabinetStyle, marginPct: number): number {
  if (style === 'Framed') return FRAMED_BASE_FACTOR * (0.90 + marginPct);
  return FRAMELESS_BASE_FACTOR * (0.70 + marginPct);
}

// Purchase price factor (cost basis — at 0% margin)
function getPurchaseFactor(style: CabinetStyle): number {
  return getMarginFactor(style, 0);
}

function computeLine(
  id: string,
  sku: string,
  qty: number,
  state: BidState,
  factor: number
): ComputedLineItem {
  const item = lookupItem(sku, state.cabinetStyle);
  const listPrice = getListPrice(sku, state.cabinetStyle, state.cabinetFinish, state.boxConstruction);
  const unitPrice = listPrice * factor;
  const lineAmount = qty * unitPrice;
  const handleCount = getHandleCount(sku, state.cabinetStyle);
  const totalHandles = handleCount * qty;

  return {
    id,
    sku,
    description: item?.description ?? '',
    category: item?.category ?? '',
    quantity: qty,
    listPrice,
    unitPrice,
    lineAmount,
    handleCount,
    totalHandles,
  };
}

export function computeBidSummary(state: BidState): BidSummary {
  const factor = getMarginFactor(state.cabinetStyle, state.priceMarginPct);
  const purchaseFactor = getPurchaseFactor(state.cabinetStyle);

  const computedUnitTypes: ComputedUnitType[] = state.unitTypes.map(ut => {
    const cabinets: ComputedLineItem[] = ut.cabinets
      .filter(c => c.sku)
      .map(c => computeLine(c.id, c.sku, c.quantity || 1, state, factor));

    const accessories: ComputedLineItem[] = ut.accessories
      .filter(a => a.sku)
      .map(a => computeLine(a.id, a.sku, a.quantity || 1, state, factor));

    const unitCabinetAmount = cabinets.reduce((s, c) => s + c.lineAmount, 0);
    const unitAccessoryAmount = accessories.reduce((s, a) => s + a.lineAmount, 0);
    const unitTotalAmount = unitCabinetAmount + unitAccessoryAmount;
    const unitTotalCabinets = cabinets.reduce((s, c) => s + c.quantity, 0);
    const unitTotalTrim = accessories.reduce((s, a) => s + a.quantity, 0);
    const unitHandles = cabinets.reduce((s, c) => s + c.totalHandles, 0);

    return {
      id: ut.id,
      name: ut.name,
      quantity: ut.quantity,
      cabinets,
      accessories,
      unitCabinetAmount,
      unitAccessoryAmount,
      unitTotalAmount,
      unitTotalCabinets,
      unitTotalTrim,
      unitHandles,
      totalBuildingAmount: unitTotalAmount * ut.quantity,
      totalBuildingCabinets: unitTotalCabinets * ut.quantity,
      totalBuildingHandles: unitHandles * ut.quantity,
    };
  });

  const totalUnitQty = computedUnitTypes.reduce((s, ut) => s + ut.quantity, 0);
  const totalCabinets = computedUnitTypes.reduce((s, ut) => s + ut.totalBuildingCabinets, 0);
  const totalTrimPieces = computedUnitTypes.reduce((s, ut) => s + ut.unitTotalTrim * ut.quantity, 0);
  const totalHandles = computedUnitTypes.reduce((s, ut) => s + ut.totalBuildingHandles, 0);
  const cabinetRevenue = computedUnitTypes.reduce((s, ut) => s + ut.totalBuildingAmount, 0);

  // Total list price (before factor) for cost calculation
  const totalListPrice = factor > 0 ? cabinetRevenue / factor : 0;

  const buildRevenue = totalCabinets * BUILD_COST_PER_BOX;
  const handleRevenue = totalHandles * HANDLE_PRICE_PER_UNIT;
  const shippingRevenue = totalUnitQty * SHIPPING_PER_UNIT;
  const totalRevenue = cabinetRevenue + buildRevenue + handleRevenue + shippingRevenue;

  const cabinetCost = totalListPrice * purchaseFactor;
  const buildCost = totalCabinets * BUILD_COST_PER_BOX;
  const handleCost = totalHandles * HANDLE_COST_PER_UNIT;
  const shippingToAZ = Math.ceil(totalCabinets / CABS_PER_TRUCK_TO_AZ) * COST_PER_TRUCK_TO_AZ;
  const shippingToJob = Math.ceil(totalCabinets / CABS_PER_TRUCK_TO_JOB) * COST_PER_TRUCK_TO_JOB;
  const totalShipping = shippingToAZ + shippingToJob;
  const totalCost = cabinetCost + buildCost + handleCost + totalShipping;

  const grossProfit = totalRevenue - totalCost;
  const grossProfitMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

  return {
    unitTypes: computedUnitTypes,
    totalUnitQty,
    totalCabinets,
    totalTrimPieces,
    totalHandles,
    totalListPrice,
    cabinetRevenue,
    buildRevenue,
    handleRevenue,
    shippingRevenue,
    totalRevenue,
    cabinetCost,
    buildCost,
    handleCost,
    shippingToAZ,
    shippingToJob,
    totalShipping,
    totalCost,
    grossProfit,
    grossProfitMargin,
  };
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
