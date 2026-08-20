import { createBlankInvoice, type Invoice } from './invoice';

const DRAFT_KEY = 'billsnap.draft.v1';
const SAVED_KEY = 'billsnap.saved.v1';
const PRO_KEY = 'billsnap.pro.v1';

export interface SavedInvoice {
  id: string;
  updatedAt: string;
  invoice: Invoice;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadDraft(): Invoice {
  const draft = readJson<Invoice | null>(DRAFT_KEY, null);
  return draft ?? createBlankInvoice();
}

export function saveDraft(invoice: Invoice): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
}

export function listSaved(): SavedInvoice[] {
  const rows = readJson<SavedInvoice[]>(SAVED_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export function upsertSaved(invoice: Invoice): SavedInvoice[] {
  const rows = listSaved();
  const id = invoice.number || crypto.randomUUID();
  const next: SavedInvoice = {
    id,
    updatedAt: new Date().toISOString(),
    invoice: { ...invoice, number: invoice.number || id },
  };
  const others = rows.filter((row) => row.id !== id && row.invoice.number !== invoice.number);
  const merged = [next, ...others];
  localStorage.setItem(SAVED_KEY, JSON.stringify(merged));
  return merged;
}

export function deleteSaved(id: string): SavedInvoice[] {
  const merged = listSaved().filter((row) => row.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(merged));
  return merged;
}

export function isProUnlocked(): boolean {
  return readJson<string>(PRO_KEY, '') === '1';
}

export function unlockPro(): void {
  localStorage.setItem(PRO_KEY, '1');
}

export function lockPro(): void {
  localStorage.removeItem(PRO_KEY);
}
