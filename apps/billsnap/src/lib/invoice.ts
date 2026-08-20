export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Party {
  name: string;
  email: string;
  address: string;
}

export type TemplateId = 'classic' | 'minimal' | 'bold';
export type PaymentTerms = 'receipt' | 'net7' | 'net15' | 'net30' | 'net60';

export interface Invoice {
  number: string;
  issuedOn: string;
  dueOn: string;
  terms: PaymentTerms;
  from: Party;
  billTo: Party;
  items: LineItem[];
  taxPercent: number;
  discountPercent: number;
  taxLabel: string;
  notes: string;
  paymentDetails: string;
  currency: string;
  accent: string;
  template: TemplateId;
  logoDataUrl: string;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'INR',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'BRL',
  'MXN',
  'ZAR',
  'SGD',
  'HKD',
  'NZD',
] as const;

export const ACCENTS = ['#0f766e', '#1d4ed8', '#be123c', '#c2410c', '#334155'] as const;

export const TERMS_DAYS: Record<PaymentTerms, number> = {
  receipt: 0,
  net7: 7,
  net15: 15,
  net30: 30,
  net60: 60,
};

export const TERMS_LABEL: Record<PaymentTerms, string> = {
  receipt: 'Due on receipt',
  net7: 'Net 7',
  net15: 'Net 15',
  net30: 'Net 30',
  net60: 'Net 60',
};

export const FREE_SAVED_LIMIT = 5;
export const PRO_TEMPLATES: TemplateId[] = ['bold'];

export function isProTemplate(template: TemplateId): boolean {
  return PRO_TEMPLATES.includes(template);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(
  invoice: Pick<Invoice, 'items' | 'taxPercent' | 'discountPercent'>,
): Totals {
  const subtotal = roundMoney(
    invoice.items.reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.rate), 0),
  );
  const discountPct = Math.min(Math.max(safeNumber(invoice.discountPercent), 0), 100);
  const taxPct = Math.max(safeNumber(invoice.taxPercent), 0);
  const discount = roundMoney(subtotal * (discountPct / 100));
  const taxable = roundMoney(subtotal - discount);
  const tax = roundMoney(taxable * (taxPct / 100));
  const total = roundMoney(taxable + tax);
  return { subtotal, discount, tax, total };
}

export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${roundMoney(amount).toFixed(2)}`;
  }
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map((p) => Number(p));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined || Number.isNaN(y + m + d)) {
    return isoDate;
  }
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

export function dueDateFromTerms(issuedOn: string, terms: PaymentTerms): string {
  return addDays(issuedOn, TERMS_DAYS[terms]);
}

export function nextInvoiceNumber(now = new Date(), serial?: number): string {
  const stamp = formatIsoDate(now).replaceAll('-', '');
  const n = String(serial ?? Math.floor(1000 + Math.random() * 9000)).padStart(4, '0');
  return `INV-${stamp}-${n}`;
}

export function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 };
}

export function emptyParty(): Party {
  return { name: '', email: '', address: '' };
}

export function createBlankInvoice(now = new Date()): Invoice {
  const issuedOn = formatIsoDate(now);
  return {
    number: nextInvoiceNumber(now),
    issuedOn,
    dueOn: addDays(issuedOn, 14),
    terms: 'net15',
    from: emptyParty(),
    billTo: emptyParty(),
    items: [newItem()],
    taxPercent: 0,
    discountPercent: 0,
    taxLabel: 'Tax',
    notes: 'Thank you for your business.',
    paymentDetails: '',
    currency: 'USD',
    accent: ACCENTS[0],
    template: 'classic',
    logoDataUrl: '',
  };
}

export function sampleInvoice(now = new Date()): Invoice {
  const issuedOn = formatIsoDate(now);
  return {
    ...createBlankInvoice(now),
    from: {
      name: 'Northwind Studio',
      email: 'billing@northwind.example',
      address: '18 Harbor Lane\nPortland, OR 97201',
    },
    billTo: {
      name: 'Meridian Labs',
      email: 'ap@meridian.example',
      address: '440 Market Street, Suite 12\nSan Francisco, CA 94105',
    },
    items: [
      {
        id: 'sample-1',
        description: 'Brand website redesign',
        quantity: 1,
        rate: 4200,
      },
      {
        id: 'sample-2',
        description: 'Content migration (12 hours)',
        quantity: 12,
        rate: 95,
      },
    ],
    taxPercent: 0,
    discountPercent: 0,
    notes: 'Payment due within 15 days. Late invoices accrue 1.5% per month.',
    paymentDetails:
      'ACH: Meridian — please pay to Northwind Studio / routing on file.\nPayPal: billing@northwind.example',
    issuedOn,
    dueOn: dueDateFromTerms(issuedOn, 'net15'),
    terms: 'net15',
  };
}

export function safeNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function shouldShowWatermark(isPro: boolean): boolean {
  return !isPro;
}

export function canSaveMore(savedCount: number, isPro: boolean): boolean {
  return isPro || savedCount < FREE_SAVED_LIMIT;
}
