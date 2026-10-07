// Stock rules shared by the stock screen, the overview alerts and the low-stock API
export const LOW_STOCK = 10;

type V = { tracked: boolean; stocked: number | null; reserved: number | null };

/** Units that can still be sold (reserved units are already promised to placed orders); made-to-order is unlimited */
export const available = (v: V) => (v.tracked ? (v.stocked ?? 0) - (v.reserved ?? 0) : Infinity);
export const isLow = (v: V) => v.tracked && available(v) <= LOW_STOCK;
