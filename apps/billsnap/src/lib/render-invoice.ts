import {
  computeTotals,
  formatMoney,
  shouldShowWatermark,
  TERMS_LABEL,
  type Invoice,
} from './invoice';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function multiline(className: string, value: string): HTMLElement {
  const node = el('div', className);
  node.style.whiteSpace = 'pre-line';
  node.textContent = value;
  return node;
}

export function renderInvoicePaper(invoice: Invoice, isPro: boolean): HTMLElement {
  const totals = computeTotals(invoice);
  const paper = el('article', `paper paper-${invoice.template}`);
  paper.id = 'invoice-paper';
  paper.style.setProperty('--accent', invoice.accent);

  const header = el('header', 'paper-header');
  if (invoice.logoDataUrl.startsWith('data:image/')) {
    const img = el('img', 'paper-logo');
    img.src = invoice.logoDataUrl;
    img.alt = `${invoice.from.name || 'Business'} logo`;
    header.append(img);
  }
  const heading = el('div', 'paper-heading');
  heading.append(el('p', 'paper-kicker', 'Invoice'));
  heading.append(el('h2', 'paper-number', invoice.number || 'INV-0000'));
  header.append(heading);
  paper.append(header);

  const meta = el('section', 'paper-meta');
  const from = el('div');
  from.append(el('p', 'paper-label', 'From'));
  from.append(el('p', 'paper-strong', invoice.from.name || 'Your business'));
  if (invoice.from.email) from.append(el('p', 'paper-muted', invoice.from.email));
  if (invoice.from.address) from.append(multiline('paper-muted', invoice.from.address));
  const billTo = el('div');
  billTo.append(el('p', 'paper-label', 'Bill to'));
  billTo.append(el('p', 'paper-strong', invoice.billTo.name || 'Client name'));
  if (invoice.billTo.email) billTo.append(el('p', 'paper-muted', invoice.billTo.email));
  if (invoice.billTo.address) billTo.append(multiline('paper-muted', invoice.billTo.address));
  const dates = el('div', 'paper-dates');
  dates.append(row('Issued', invoice.issuedOn || '—'));
  dates.append(row('Due', invoice.dueOn || '—'));
  dates.append(row('Terms', TERMS_LABEL[invoice.terms]));
  meta.append(from, billTo, dates);
  paper.append(meta);

  const table = el('table', 'paper-table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const label of ['Description', 'Qty', 'Rate', 'Amount']) {
    headRow.append(el('th', '', label));
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = el('tbody');
  for (const item of invoice.items) {
    const tr = el('tr');
    tr.append(el('td', '', item.description || '—'));
    tr.append(el('td', 'num', String(item.quantity || 0)));
    tr.append(el('td', 'num', formatMoney(item.rate, invoice.currency)));
    tr.append(el('td', 'num', formatMoney(item.quantity * item.rate, invoice.currency)));
    tbody.append(tr);
  }
  table.append(tbody);
  paper.append(table);

  const totalsWrap = el('section', 'paper-totals');
  totalsWrap.append(totalRow('Subtotal', formatMoney(totals.subtotal, invoice.currency)));
  if (totals.discount > 0) {
    totalsWrap.append(totalRow('Discount', `− ${formatMoney(totals.discount, invoice.currency)}`));
  }
  if (totals.tax > 0 || invoice.taxPercent > 0) {
    totalsWrap.append(
      totalRow(
        `${invoice.taxLabel || 'Tax'} (${invoice.taxPercent}%)`,
        formatMoney(totals.tax, invoice.currency),
      ),
    );
  }
  const grand = totalRow('Total due', formatMoney(totals.total, invoice.currency));
  grand.classList.add('grand');
  totalsWrap.append(grand);
  paper.append(totalsWrap);

  if (invoice.notes || invoice.paymentDetails) {
    const extras = el('section', 'paper-extras');
    if (invoice.notes) {
      const notes = el('div');
      notes.append(el('p', 'paper-label', 'Notes'));
      notes.append(multiline('paper-muted', invoice.notes));
      extras.append(notes);
    }
    if (invoice.paymentDetails) {
      const pay = el('div');
      pay.append(el('p', 'paper-label', 'Payment'));
      pay.append(multiline('paper-muted', invoice.paymentDetails));
      extras.append(pay);
    }
    paper.append(extras);
  }

  if (shouldShowWatermark(isPro)) {
    const mark = el(
      'p',
      'paper-watermark',
      'Created with Billsnap · Unlock Pro to remove this line',
    );
    paper.append(mark);
  }

  return paper;
}

function row(label: string, value: string): HTMLElement {
  const wrap = el('div', 'paper-row');
  wrap.append(el('span', 'paper-label', label));
  wrap.append(el('span', '', value));
  return wrap;
}

function totalRow(label: string, value: string): HTMLElement {
  const wrap = el('div', 'paper-total-row');
  wrap.append(el('span', '', label));
  wrap.append(el('strong', '', value));
  return wrap;
}
