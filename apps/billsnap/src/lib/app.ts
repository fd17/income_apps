import {
  ACCENTS,
  CURRENCIES,
  canSaveMore,
  computeTotals,
  createBlankInvoice,
  dueDateFromTerms,
  formatMoney,
  FREE_SAVED_LIMIT,
  isProTemplate,
  newItem,
  sampleInvoice,
  TERMS_LABEL,
  type Invoice,
  type PaymentTerms,
  type TemplateId,
} from './invoice';
import { renderInvoicePaper } from './render-invoice';
import {
  deleteSaved,
  isProUnlocked,
  listSaved,
  loadDraft,
  saveDraft,
  unlockPro,
  upsertSaved,
  type SavedInvoice,
} from './storage';

export interface MountOptions {
  checkoutUrl: string;
  pricingHref: string;
}

let state: Invoice = createBlankInvoice();
let isPro = false;
let saved: SavedInvoice[] = [];
let options: MountOptions = { checkoutUrl: '', pricingHref: '/pricing/' };

export function mount(root: HTMLElement, opts: MountOptions): void {
  options = opts;
  isPro = isProUnlocked();
  saved = listSaved();
  state = loadDraft();
  const params = new URLSearchParams(window.location.search);
  if (params.get('unlocked') === '1' || params.get('previewPro') === '1') {
    unlockPro();
    isPro = true;
    params.delete('unlocked');
    params.delete('previewPro');
    const next = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }
  if (isProTemplate(state.template) && !isPro) state.template = 'classic';
  root.innerHTML = '';
  root.append(buildShell());
  bind(root);
  refresh(root);
}

function buildShell(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'app-shell';
  wrap.innerHTML = `
    <div class="app-toolbar no-print">
      <div class="app-toolbar-start">
        <h1>Invoice editor</h1>
        <p class="muted" data-role="save-hint"></p>
      </div>
      <div class="app-toolbar-actions">
        <button type="button" class="btn btn-ghost" data-action="sample">Load sample</button>
        <button type="button" class="btn btn-ghost" data-action="reset">New</button>
        <button type="button" class="btn btn-ghost" data-action="save">Save</button>
        <button type="button" class="btn btn-ghost" data-action="print">Download PDF</button>
        <button type="button" class="btn btn-primary" data-action="pro"></button>
      </div>
    </div>
    <div class="app-grid">
      <form class="editor no-print" data-role="form"></form>
      <div class="preview-col">
        <div class="preview-stage" data-role="preview"></div>
      </div>
    </div>
  `;
  return wrap;
}

function bind(root: HTMLElement): void {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    event.preventDefault();
    let status: string | undefined;
    if (action === 'sample') state = sampleInvoice();
    if (action === 'reset') state = createBlankInvoice();
    if (action === 'save') status = onSave();
    if (action === 'print') window.print();
    if (action === 'pro') onPro();
    if (action === 'clear-logo') state.logoDataUrl = '';
    if (action === 'accent') {
      const color = target.closest<HTMLElement>('[data-accent]')?.dataset.accent;
      if (color) state.accent = color;
    }
    if (action === 'add-item') state.items = [...state.items, newItem()];
    if (action === 'remove-item') {
      const id = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
      if (id && state.items.length > 1) state.items = state.items.filter((item) => item.id !== id);
    }
    if (action === 'load-saved') {
      const id = target.closest<HTMLElement>('[data-id]')?.dataset.id;
      const row = saved.find((item) => item.id === id);
      if (row) state = structuredClone(row.invoice);
    }
    if (action === 'delete-saved') {
      const id = target.closest<HTMLElement>('[data-id]')?.dataset.id;
      if (id) saved = deleteSaved(id);
    }
    persist();
    refresh(root);
    if (status) toast(root, status);
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    )) {
      return;
    }
    applyField(target);
    persist();
    refresh(root, { keepFocus: target });
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'file') {
      const file = target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string' && result.startsWith('data:image/')) {
          state.logoDataUrl = result;
          persist();
          refresh(root);
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

function applyField(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  const field = target.dataset.field;
  const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
  const value = target.value;

  if (itemId) {
    state.items = state.items.map((item) => {
      if (item.id !== itemId) return item;
      if (field === 'description') return { ...item, description: value };
      if (field === 'quantity') return { ...item, quantity: Number(value) };
      if (field === 'rate') return { ...item, rate: Number(value) };
      return item;
    });
    return;
  }

  if (field === 'number') state.number = value;
  if (field === 'issuedOn') {
    state.issuedOn = value;
    state.dueOn = dueDateFromTerms(value, state.terms);
  }
  if (field === 'dueOn') state.dueOn = value;
  if (field === 'terms') {
    state.terms = value as PaymentTerms;
    state.dueOn = dueDateFromTerms(state.issuedOn, state.terms);
  }
  if (field === 'from.name') state.from = { ...state.from, name: value };
  if (field === 'from.email') state.from = { ...state.from, email: value };
  if (field === 'from.address') state.from = { ...state.from, address: value };
  if (field === 'billTo.name') state.billTo = { ...state.billTo, name: value };
  if (field === 'billTo.email') state.billTo = { ...state.billTo, email: value };
  if (field === 'billTo.address') state.billTo = { ...state.billTo, address: value };
  if (field === 'taxPercent') state.taxPercent = Number(value);
  if (field === 'discountPercent') state.discountPercent = Number(value);
  if (field === 'taxLabel') state.taxLabel = value;
  if (field === 'notes') state.notes = value;
  if (field === 'paymentDetails') state.paymentDetails = value;
  if (field === 'currency') state.currency = value;
  if (field === 'accent') state.accent = value;
  if (field === 'template') {
    const template = value as TemplateId;
    if (isProTemplate(template) && !isPro) {
      onPro();
      return;
    }
    state.template = template;
  }
}

function persist(): void {
  saveDraft(state);
}

function onSave(): string | undefined {
  if (
    !canSaveMore(saved.length, isPro) &&
    !saved.some((row) => row.invoice.number === state.number)
  ) {
    onPro();
    return `Free plan saves up to ${FREE_SAVED_LIMIT} invoices. Unlock Pro for unlimited history.`;
  }
  saved = upsertSaved(state);
  return `Saved ${state.number}. Invoices stay in this browser.`;
}

function onPro(): void {
  if (isPro) return;
  if (options.checkoutUrl) {
    window.open(options.checkoutUrl, '_blank', 'noopener');
    return;
  }
  window.location.href = options.pricingHref;
}

function toast(root: HTMLElement, message: string): void {
  const hint = root.querySelector('[data-role="save-hint"]');
  if (hint) hint.textContent = message;
}

function refresh(root: HTMLElement, opts?: { keepFocus?: HTMLElement }): void {
  const form = root.querySelector('[data-role="form"]');
  const preview = root.querySelector('[data-role="preview"]');
  const proBtn = root.querySelector('[data-action="pro"]');
  const hint = root.querySelector('[data-role="save-hint"]');
  if (!(form instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;

  const activeField =
    opts?.keepFocus instanceof HTMLElement ? opts.keepFocus.dataset.field : undefined;
  const activeItem =
    opts?.keepFocus instanceof HTMLElement
      ? opts.keepFocus.closest<HTMLElement>('[data-item-id]')?.dataset.itemId
      : undefined;
  const selectionStart =
    opts?.keepFocus instanceof HTMLInputElement || opts?.keepFocus instanceof HTMLTextAreaElement
      ? opts.keepFocus.selectionStart
      : null;

  form.innerHTML = '';
  form.append(renderForm());
  preview.innerHTML = '';
  preview.append(renderInvoicePaper(state, isPro));

  if (proBtn) {
    proBtn.textContent = isPro ? 'Pro unlocked' : 'Remove branding · $9';
    proBtn.toggleAttribute('disabled', isPro);
  }
  if (hint) {
    hint.textContent = isPro
      ? 'Pro is on — no Billsnap line on the PDF, unlimited saves.'
      : `Free plan · ${saved.length}/${FREE_SAVED_LIMIT} saved invoices in this browser`;
  }

  if (activeField) {
    const selector = activeItem
      ? `[data-item-id="${cssEscape(activeItem)}"] [data-field="${cssEscape(activeField)}"]`
      : `[data-field="${cssEscape(activeField)}"]`;
    const again = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (again) {
      again.focus();
      if (selectionStart !== null && typeof again.setSelectionRange === 'function') {
        again.setSelectionRange(selectionStart, selectionStart);
      }
    }
  }
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/"/g, '\\"');
}

function renderForm(): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.append(
    section('Invoice', [
      field('Number', input('text', 'number', state.number)),
      selectField(
        'Terms',
        'terms',
        Object.entries(TERMS_LABEL).map(([value, label]) => ({ value, label })),
        state.terms,
      ),
      field('Issued', input('date', 'issuedOn', state.issuedOn)),
      field('Due', input('date', 'dueOn', state.dueOn)),
      selectField(
        'Currency',
        'currency',
        CURRENCIES.map((value) => ({ value, label: value })),
        state.currency,
      ),
    ]),
  );
  frag.append(
    section('From', [
      field('Business name', input('text', 'from.name', state.from.name, 'Northwind Studio')),
      field('Email', input('email', 'from.email', state.from.email, 'you@studio.com')),
      field('Address', textarea('from.address', state.from.address, 'Street, city, country')),
      logoField(),
    ]),
  );
  frag.append(
    section('Bill to', [
      field('Client', input('text', 'billTo.name', state.billTo.name, 'Acme Corp')),
      field('Email', input('email', 'billTo.email', state.billTo.email, 'ap@acme.com')),
      field('Address', textarea('billTo.address', state.billTo.address, 'Street, city, country')),
    ]),
  );
  frag.append(itemsSection());
  frag.append(
    section('Totals & notes', [
      field('Tax label', input('text', 'taxLabel', state.taxLabel, 'VAT')),
      field('Tax %', input('number', 'taxPercent', String(state.taxPercent))),
      field('Discount %', input('number', 'discountPercent', String(state.discountPercent))),
      field('Notes', textarea('notes', state.notes, 'Thank you for your business.')),
      field(
        'Payment details',
        textarea('paymentDetails', state.paymentDetails, 'Bank, PayPal.me, Wise, or a payment URL'),
      ),
    ]),
  );
  frag.append(styleSection());
  frag.append(savedSection());
  return frag;
}

function section(title: string, children: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'editor-section';
  const h = document.createElement('h2');
  h.textContent = title;
  wrap.append(h);
  const grid = document.createElement('div');
  grid.className = 'editor-fields';
  for (const child of children) grid.append(child);
  wrap.append(grid);
  return wrap;
}

function field(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function input(type: string, fieldName: string, value: string, placeholder = ''): HTMLInputElement {
  const node = document.createElement('input');
  node.type = type;
  node.dataset.field = fieldName;
  node.value = value;
  if (placeholder) node.placeholder = placeholder;
  if (type === 'number') {
    node.min = '0';
    node.step = 'any';
  }
  return node;
}

function textarea(fieldName: string, value: string, placeholder = ''): HTMLTextAreaElement {
  const node = document.createElement('textarea');
  node.dataset.field = fieldName;
  node.value = value;
  node.rows = 3;
  if (placeholder) node.placeholder = placeholder;
  return node;
}

function selectField(
  label: string,
  fieldName: string,
  choices: { value: string; label: string }[],
  current: string,
): HTMLElement {
  const node = document.createElement('select');
  node.dataset.field = fieldName;
  for (const choice of choices) {
    const opt = document.createElement('option');
    opt.value = choice.value;
    opt.textContent = choice.label;
    opt.selected = choice.value === current;
    node.append(opt);
  }
  return field(label, node);
}

function logoField(): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = 'Logo';
  const node = document.createElement('input');
  node.type = 'file';
  node.accept = 'image/*';
  wrap.append(span, node);
  if (state.logoDataUrl) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'linkish';
    clear.dataset.action = 'clear-logo';
    clear.textContent = 'Remove logo';
    wrap.append(clear);
  }
  return wrap;
}

function itemsSection(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'editor-section';
  const h = document.createElement('h2');
  h.textContent = 'Line items';
  wrap.append(h);
  for (const item of state.items) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.itemId = item.id;
    row.append(
      field(
        'Description',
        input('text', 'description', item.description, 'Design, hours, license…'),
      ),
    );
    const qty = input('number', 'quantity', String(item.quantity));
    qty.step = 'any';
    row.append(field('Qty', qty));
    row.append(field('Rate', input('number', 'rate', String(item.rate))));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-ghost item-remove';
    remove.dataset.action = 'remove-item';
    remove.textContent = 'Remove';
    row.append(remove);
    wrap.append(row);
  }
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn btn-ghost';
  add.dataset.action = 'add-item';
  add.textContent = 'Add line';
  wrap.append(add);
  const totals = computeTotals(state);
  const live = document.createElement('p');
  live.className = 'muted';
  live.textContent = `Total due ${formatMoney(totals.total, state.currency)}`;
  wrap.append(live);
  return wrap;
}

function styleSection(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'editor-section';
  const heading = document.createElement('h2');
  heading.textContent = 'Look';
  wrap.append(heading);
  const grid = document.createElement('div');
  grid.className = 'editor-fields';
  const templates: { value: TemplateId; label: string }[] = [
    { value: 'classic', label: 'Classic' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'bold', label: isPro ? 'Bold' : 'Bold (Pro)' },
  ];
  grid.append(selectField('Template', 'template', templates, state.template));
  const accentWrap = document.createElement('div');
  accentWrap.className = 'accent-row';
  for (const color of ACCENTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `accent-swatch${state.accent === color ? ' is-on' : ''}`;
    btn.style.background = color;
    btn.dataset.action = 'accent';
    btn.dataset.accent = color;
    btn.setAttribute('aria-label', `Accent ${color}`);
    accentWrap.append(btn);
  }
  grid.append(field('Accent', accentWrap));
  wrap.append(grid);
  return wrap;
}

function savedSection(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'editor-section';
  const heading = document.createElement('h2');
  heading.textContent = 'Saved in this browser';
  wrap.append(heading);
  if (saved.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nothing saved yet. Save keeps invoices on this device only.';
    wrap.append(empty);
    return wrap;
  }
  const list = document.createElement('ul');
  list.className = 'saved-list';
  for (const row of saved) {
    const li = document.createElement('li');
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'linkish';
    load.dataset.action = 'load-saved';
    load.dataset.id = row.id;
    load.textContent = `${row.invoice.number} · ${row.invoice.billTo.name || 'No client'}`;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'linkish danger';
    del.dataset.action = 'delete-saved';
    del.dataset.id = row.id;
    del.textContent = 'Delete';
    li.append(load, del);
    list.append(li);
  }
  wrap.append(list);
  return wrap;
}
