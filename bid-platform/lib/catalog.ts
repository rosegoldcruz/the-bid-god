import catalogData from './catalog-data.json';
import type { CatalogEntry, FramelessItem, CabinetStyle, BoxConstruction } from './types';

export const FRAMED_FINISHES = catalogData.framed.finishes as string[];
export const FRAMELESS_FINISHES = catalogData.frameless.finishes as string[];

export function getFinishesForStyle(style: CabinetStyle): string[] {
  return style === 'Framed' ? FRAMED_FINISHES : FRAMELESS_FINISHES;
}

export function getCabinetCatalog(style: CabinetStyle): CatalogEntry[] {
  if (style === 'Framed') return catalogData.framed.cabinets as CatalogEntry[];
  return catalogData.frameless.cabinets as CatalogEntry[];
}

export function getAccessoryCatalog(style: CabinetStyle): CatalogEntry[] {
  if (style === 'Framed') return catalogData.framed.accessories as CatalogEntry[];
  return catalogData.frameless.accessories as CatalogEntry[];
}

export function getAllCatalogItems(style: CabinetStyle): CatalogEntry[] {
  return [...getCabinetCatalog(style), ...getAccessoryCatalog(style)];
}

export function lookupItem(sku: string, style: CabinetStyle): CatalogEntry | undefined {
  const all = getAllCatalogItems(style);
  return all.find(item => item.sku === sku);
}

export function getListPrice(
  sku: string,
  style: CabinetStyle,
  finish: string,
  boxConstruction: BoxConstruction
): number {
  const item = lookupItem(sku, style);
  if (!item) return 0;

  if (style === 'Framed') {
    const framedItem = item as { prices?: Record<string, number> };
    return framedItem.prices?.[finish] ?? 0;
  } else {
    const framelessItem = item as FramelessItem;
    if (framelessItem.pricesByBox) {
      return framelessItem.pricesByBox[boxConstruction]?.[finish] ?? 0;
    }
    return framelessItem.prices?.[finish] ?? 0;
  }
}

export function getHandleCount(sku: string, style: CabinetStyle): number {
  const item = lookupItem(sku, style);
  return item?.handleCount ?? 0;
}

export function getCategoriesForStyle(style: CabinetStyle): string[] {
  const items = getAllCatalogItems(style);
  const cats = new Set(items.map(i => i.category).filter(Boolean));
  return Array.from(cats);
}
