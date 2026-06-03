export type CabinetStyle = 'Framed' | 'Frameless';
export type BoxConstruction = 'Plywood' | 'PB w/ Wood Drawers' | 'PB w/ PB Drawers';

export interface CatalogItem {
  sku: string;
  description: string;
  category: string;
  handleCount: number;
  isAccessory: boolean;
}

export interface FramedItem extends CatalogItem {
  prices: Record<string, number>;
  pricesByBox?: never;
}

export interface FramelessItem extends CatalogItem {
  pricesByBox: Record<string, Record<string, number>>;
  prices?: never;
}

export type CatalogEntry = FramedItem | FramelessItem;

export interface LineItem {
  id: string;
  sku: string;
  quantity: number;
}

export interface UnitType {
  id: string;
  name: string;
  quantity: number;
  cabinets: LineItem[];
  accessories: LineItem[];
}

export interface BidState {
  projectName: string;
  cabinetStyle: CabinetStyle;
  cabinetFinish: string;
  boxConstruction: BoxConstruction;
  priceMarginLabel: string;
  priceMarginPct: number;
  unitTypes: UnitType[];
}

export interface ComputedLineItem {
  id: string;
  sku: string;
  description: string;
  category: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  lineAmount: number;
  handleCount: number;
  totalHandles: number;
}

export interface ComputedUnitType {
  id: string;
  name: string;
  quantity: number;
  cabinets: ComputedLineItem[];
  accessories: ComputedLineItem[];
  unitCabinetAmount: number;
  unitAccessoryAmount: number;
  unitTotalAmount: number;
  unitTotalCabinets: number;
  unitTotalTrim: number;
  unitHandles: number;
  totalBuildingAmount: number;
  totalBuildingCabinets: number;
  totalBuildingHandles: number;
}

export interface BidSummary {
  unitTypes: ComputedUnitType[];
  totalUnitQty: number;
  totalCabinets: number;
  totalTrimPieces: number;
  totalHandles: number;
  totalListPrice: number;
  cabinetRevenue: number;
  buildRevenue: number;
  handleRevenue: number;
  shippingRevenue: number;
  totalRevenue: number;
  cabinetCost: number;
  buildCost: number;
  handleCost: number;
  shippingToAZ: number;
  shippingToJob: number;
  totalShipping: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
}
