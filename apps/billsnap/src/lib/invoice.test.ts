import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  canSaveMore,
  computeTotals,
  dueDateFromTerms,
  formatIsoDate,
  formatMoney,
  FREE_SAVED_LIMIT,
  isProTemplate,
  nextInvoiceNumber,
  roundMoney,
  safeNumber,
  shouldShowWatermark,
  type Invoice,
} from './invoice.ts';

function invoice(
  partial: Partial<Invoice> = {},
): Pick<Invoice, 'items' | 'taxPercent' | 'discountPercent'> {
  return {
    items: [{ id: '1', description: 'A', quantity: 2, rate: 50 }],
    taxPercent: 0,
    discountPercent: 0,
    ...partial,
  };
}

test('roundMoney rounds to cents', () => {
  assert.equal(roundMoney(10.126), 10.13);
  assert.equal(roundMoney(10.124), 10.12);
  assert.equal(roundMoney(10), 10);
});

test('computeTotals sums line items', () => {
  const totals = computeTotals(invoice());
  assert.equal(totals.subtotal, 100);
  assert.equal(totals.discount, 0);
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 100);
});

test('computeTotals applies discount then tax', () => {
  const totals = computeTotals(
    invoice({
      items: [{ id: '1', description: 'A', quantity: 1, rate: 200 }],
      discountPercent: 10,
      taxPercent: 10,
    }),
  );
  assert.equal(totals.subtotal, 200);
  assert.equal(totals.discount, 20);
  assert.equal(totals.tax, 18);
  assert.equal(totals.total, 198);
});

test('computeTotals treats bad numeric input as zero', () => {
  const totals = computeTotals(
    invoice({
      items: [{ id: '1', description: 'A', quantity: Number.NaN, rate: 40 }],
      taxPercent: Number.POSITIVE_INFINITY,
    }),
  );
  assert.equal(totals.subtotal, 0);
  assert.equal(totals.total, 0);
});

test('safeNumber coerces invalid values to 0', () => {
  assert.equal(safeNumber('nope'), 0);
  assert.equal(safeNumber(undefined), 0);
  assert.equal(safeNumber('3.5'), 3.5);
});

test('formatMoney uses ISO currency codes', () => {
  const usd = formatMoney(1234.5, 'USD', 'en-US');
  assert.match(usd, /1,234\.50/);
  assert.equal(formatMoney(10, 'NOTAREALCURRENCY'), 'NOTAREALCURRENCY 10.00');
});

test('addDays stays on the calendar date', () => {
  assert.equal(addDays('2026-01-30', 1), '2026-01-31');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
});

test('dueDateFromTerms maps net terms to days', () => {
  assert.equal(dueDateFromTerms('2026-08-20', 'receipt'), '2026-08-20');
  assert.equal(dueDateFromTerms('2026-08-20', 'net30'), '2026-09-19');
});

test('nextInvoiceNumber is stable when serial is provided', () => {
  const n = nextInvoiceNumber(new Date(2026, 7, 20), 42);
  assert.equal(n, 'INV-20260820-0042');
});

test('formatIsoDate uses local calendar fields', () => {
  assert.equal(formatIsoDate(new Date(2026, 0, 5)), '2026-01-05');
});

test('watermark and save limits depend on Pro', () => {
  assert.equal(shouldShowWatermark(false), true);
  assert.equal(shouldShowWatermark(true), false);
  assert.equal(canSaveMore(FREE_SAVED_LIMIT - 1, false), true);
  assert.equal(canSaveMore(FREE_SAVED_LIMIT, false), false);
  assert.equal(canSaveMore(99, true), true);
});

test('bold template is gated as Pro', () => {
  assert.equal(isProTemplate('classic'), false);
  assert.equal(isProTemplate('bold'), true);
});
