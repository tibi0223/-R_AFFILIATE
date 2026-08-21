/**
 * Stripe összeg → egész forint.
 * A Stripe a legtöbb pénznemet a legkisebb egységben küldi (fillér, cent), ezért
 * 100-zal osztunk. A HUF is ilyen: a Stripe "100-multiple" pénznemként kezeli.
 * Kivétel a tizedes nélküli pénznemek listája (JPY, KRW, ...), ott az érték már egész.
 */
const ZERO_DECIMAL = ["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","vnd","vuv","xaf","xof","xpf"];

export function stripeAmountToHuf(amount: number, currency: string): number {
  if (ZERO_DECIMAL.includes(currency.toLowerCase())) return Math.round(amount);
  return Math.round(amount / 100);
}

export function formatFt(n: number): string {
  return n.toLocaleString("hu-HU") + " Ft";
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
