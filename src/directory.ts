import './styles/main.css';
import { loadSettings, getAll, COLS, FALLBACK_OFFICERS, FALLBACK_TERMS } from './firebase';
import type { Officer, Term, SiteSettings } from './types';

// State
let allOfficers: Officer[] = [];
let allTerms: Term[] = [];
let activeTermId: string | null = null;
let viewMode: 'grid' | 'list' = 'grid';

/**
 * Apply Site Settings / Branding
 */
async function applyBranding(): Promise<SiteSettings> {
  const s = await loadSettings();
  const root = document.documentElement;
  if (s.colorPrimary) root.style.setProperty('--blue', s.colorPrimary);
  if (s.colorAccent)  root.style.setProperty('--yellow', s.colorAccent);

  const navLogo = document.getElementById('navLogo') as HTMLImageElement | null;
  if (navLogo) {
    navLogo.src = s.logoUrl || 'landing-page-imgs/ACCeSS-Logo.png';
    navLogo.style.display = 'block';
  }

  const navBrandName = document.getElementById('navBrandName');
  if (navBrandName && s.siteName) navBrandName.textContent = s.siteName;

  const footerName = document.getElementById('footerName');
  if (footerName && s.siteName) footerName.textContent = s.siteName;

  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear().toString();

  const navCtaBtn = document.getElementById('navCtaBtn') as HTMLAnchorElement | null;
  if (navCtaBtn) {
    navCtaBtn.textContent = s.ctaLabel || 'Join Us';
    navCtaBtn.href = s.ctaLink || 'index.html#cta';
  }

  return s;
}

/**
 * Load Officers and Terms from Firestore
 */
async function loadAll() {
  const [rawOfficers, rawTerms] = await Promise.all([
    getAll<Officer>(COLS.DIRECTORY),
    getAll<Term>(COLS.TERMS),
  ]);

  allOfficers = rawOfficers.length > 0 ? rawOfficers : FALLBACK_OFFICERS;
  allTerms = rawTerms.length > 0 ? rawTerms : FALLBACK_TERMS;

  const skeleton = document.getElementById('skeleton');
  const outputArea = document.getElementById('outputArea');
  if (skeleton) skeleton.classList.add('hidden');
  if (outputArea) outputArea.classList.remove('hidden');

  // Filter valid terms that have officers
  const validTerms = allTerms.filter(t => allOfficers.some(o => o.term === t.id));
  const fallbackTerms = [...new Set(allOfficers.map(o => o.term).filter(Boolean))].map(id => ({ id, name: id } as Term));
  const displayTerms = validTerms.length > 0 ? validTerms : fallbackTerms;

  const statTerms = document.getElementById('statTerms');
  if (statTerms) statTerms.textContent = displayTerms.length.toString();

  if (displayTerms.length === 0) {
    renderEmpty('no-data');
    return;
  }

  activeTermId = displayTerms[displayTerms.length - 1].id;

  renderTermTabs(displayTerms);
  buildCommitteeFilter();
  updateStats();
  render();
}

/**
 * Render Academic Term Tabs
 */
function renderTermTabs(terms: Term[]) {
  const el = document.getElementById('termTabsEl');
  if (!el) return;

  el.innerHTML = terms.map(t => `
    <button class="term-tab px-4 py-1.5 rounded-full text-xs font-sans font-semibold transition-all duration-200 ${
      t.id === activeTermId
        ? 'bg-primary-container text-surface font-bold shadow-md'
        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
    }" data-id="${t.id}">
      ${t.name}
    </button>
  `).join('');

  el.querySelectorAll('.term-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTermId = btn.getAttribute('data-id');
      renderTermTabs(terms);
      buildCommitteeFilter();
      updateStats();
      render();
    });
  });
}

/**
 * Build Committee Filter Dropdown
 */
function buildCommitteeFilter() {
  const officers = allOfficers.filter(o => o.term === activeTermId);
  const committees = [...new Set(officers.map(o => o.dept).filter(Boolean))].sort();
  const sel = document.getElementById('committeeFilter') as HTMLSelectElement | null;
  if (!sel) return;

  const cur = sel.value;
  sel.innerHTML = '<option value="">All Standing Committees</option>' +
    committees.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
}

/**
 * Update Header Statistics
 */
function updateStats() {
  const forTerm = allOfficers.filter(o => o.term === activeTermId);
  const committees = [...new Set(forTerm.map(o => o.dept).filter(Boolean))];

  const statOfficers = document.getElementById('statOfficers');
  const statCommittees = document.getElementById('statCommittees');

  if (statOfficers) statOfficers.textContent = allOfficers.length.toString();
  if (statCommittees) statCommittees.textContent = committees.length.toString();
}

/**
 * Render Officers Grid / List
 */
function render() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const committeeFilter = document.getElementById('committeeFilter') as HTMLSelectElement | null;
  const resultCount = document.getElementById('resultCount');
  const outputArea = document.getElementById('outputArea');

  if (!outputArea) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCommittee = committeeFilter?.value || '';

  let officers = allOfficers.filter(o => o.term === activeTermId);

  if (selectedCommittee) {
    officers = officers.filter(o => o.dept === selectedCommittee);
  }

  if (query) {
    officers = officers.filter(o =>
      (`${o.first} ${o.last}`).toLowerCase().includes(query) ||
      (o.role || '').toLowerCase().includes(query) ||
      (o.dept || '').toLowerCase().includes(query) ||
      (o.bio || '').toLowerCase().includes(query)
    );
  }

  // Sort by order
  officers.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));

  if (resultCount) {
    resultCount.textContent = `${officers.length} officer${officers.length !== 1 ? 's' : ''}`;
  }

  if (officers.length === 0) {
    renderEmpty(query ? 'no-results' : 'no-officers', query);
    return;
  }

  // Group by Standing Committee if neither search nor committee dropdown is active
  const shouldGroup = !query && !selectedCommittee;

  if (viewMode === 'grid') {
    if (shouldGroup) {
      const committees = [...new Set(officers.map(o => o.dept || 'Executive Board'))];
      outputArea.innerHTML = committees.map(c => {
        const group = officers.filter(o => (o.dept || 'Executive Board') === c);
        if (!group.length) return '';
        return `
          <div class="mb-10">
            <div class="flex items-center gap-3 mb-6 pb-2 border-b border-white/10">
              <h3 class="font-headline font-bold text-lg text-primary-container tracking-wide">${c}</h3>
              <span class="text-xs font-sans text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">${group.length} officer${group.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              ${group.map(renderGridCard).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      outputArea.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          ${officers.map(renderGridCard).join('')}
        </div>
      `;
    }
  } else {
    if (shouldGroup) {
      const committees = [...new Set(officers.map(o => o.dept || 'Executive Board'))];
      outputArea.innerHTML = committees.map(c => {
        const group = officers.filter(o => (o.dept || 'Executive Board') === c);
        if (!group.length) return '';
        return `
          <div class="mb-10">
            <div class="flex items-center gap-3 mb-4 pb-2 border-b border-white/10">
              <h3 class="font-headline font-bold text-lg text-primary-container tracking-wide">${c}</h3>
              <span class="text-xs font-sans text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">${group.length}</span>
            </div>
            <div class="flex flex-col gap-3">
              ${group.map(renderListRow).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      outputArea.innerHTML = `
        <div class="flex flex-col gap-3">
          ${officers.map(renderListRow).join('')}
        </div>
      `;
    }
  }

  // Wire click handlers for modal
  outputArea.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      if (id) openModal(id);
    });
  });

  // Prevent link click opening modal
  outputArea.querySelectorAll('.social-link-btn').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });
}

function renderEmpty(reason: string, query?: string) {
  const outputArea = document.getElementById('outputArea');
  if (!outputArea) return;

  const msgs: Record<string, [string, string]> = {
    'no-data': ['No officers listed yet', 'Officers will appear here once registered by the consortium.'],
    'no-results': [`No results found for "${query}"`, 'Try searching by another officer name, role, or committee.'],
    'no-officers': ['No officers found for this term', 'This academic term has no roster records.'],
  };

  const [title, desc] = msgs[reason] || msgs['no-data'];

  outputArea.innerHTML = `
    <div class="glass-panel p-12 rounded-2xl text-center border border-white/10 my-8">
      <div class="text-4xl mb-3">👥</div>
      <h3 class="text-lg font-headline font-semibold text-white">${title}</h3>
      <p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto font-light">${desc}</p>
    </div>
  `;
}

function getInitials(o: Officer): string {
  return ((o.first || '?').charAt(0) + (o.last || '').charAt(0)).toUpperCase();
}

function renderGridCard(o: Officer): string {
  const ini = getInitials(o);
  const avatarHtml = o.photo
    ? `<img src="${o.photo}" alt="${o.first}" class="w-20 h-20 rounded-full object-cover border-2 border-primary-container/40 group-hover:border-primary-container transition-colors shadow-lg" onerror="this.outerHTML='<div class=\\'w-20 h-20 rounded-full bg-surface-lowest border-2 border-primary-container/40 flex items-center justify-center text-primary-container font-headline font-bold text-xl\\'>${ini}</div>'"/>`
    : `<div class="w-20 h-20 rounded-full bg-surface-lowest border-2 border-primary-container/40 flex items-center justify-center text-primary-container font-headline font-bold text-xl">${ini}</div>`;

  const socials = [
    o.fb ? `<a href="${o.fb}" target="_blank" rel="noopener noreferrer" class="social-link-btn w-7 h-7 rounded-lg bg-surface-lowest hover:bg-primary-container text-slate-400 hover:text-surface flex items-center justify-center transition-colors border border-white/10"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>` : '',
    o.email ? `<a href="mailto:${o.email}" class="social-link-btn w-7 h-7 rounded-lg bg-surface-lowest hover:bg-primary-container text-slate-400 hover:text-surface flex items-center justify-center transition-colors border border-white/10"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></a>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="glass-panel hover:glass-panel-elevated p-5 rounded-2xl text-center group transition-all duration-300 border border-white/10 hover:border-primary-container/40 flex flex-col items-center justify-between cursor-pointer" data-id="${o.id}">
      <div class="flex flex-col items-center w-full">
        <div class="relative mb-3">
          ${avatarHtml}
        </div>
        <h4 class="font-headline font-semibold text-white text-sm group-hover:text-primary-container transition-colors leading-tight line-clamp-2">
          ${o.first || ''} ${o.last || ''}
        </h4>
        <p class="text-xs text-[#7BD0FF] mt-1 font-sans font-medium leading-tight line-clamp-2">
          ${o.role || ''}
        </p>
      </div>
      <div class="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-2">
        ${socials || `<span class="text-[10px] font-sans text-slate-400">ACCeSS Member</span>`}
      </div>
    </div>
  `;
}

function renderListRow(o: Officer): string {
  const ini = getInitials(o);
  const avatarHtml = o.photo
    ? `<img src="${o.photo}" alt="${o.first}" class="w-12 h-12 rounded-full object-cover border border-primary-container/30 flex-shrink-0" onerror="this.outerHTML='<div class=\\'w-12 h-12 rounded-full bg-surface-lowest border border-primary-container/30 flex items-center justify-center text-primary-container font-headline font-bold\\'>${ini}</div>'"/>`
    : `<div class="w-12 h-12 rounded-full bg-surface-lowest border border-primary-container/30 flex items-center justify-center text-primary-container font-headline font-bold flex-shrink-0">${ini}</div>`;

  const actions = [
    o.email ? `<a href="mailto:${o.email}" class="social-link-btn w-8 h-8 rounded-lg bg-surface-lowest hover:bg-primary-container text-slate-400 hover:text-surface flex items-center justify-center transition-colors border border-white/10"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></a>` : '',
    o.fb ? `<a href="${o.fb}" target="_blank" rel="noopener noreferrer" class="social-link-btn w-8 h-8 rounded-lg bg-surface-lowest hover:bg-primary-container text-slate-400 hover:text-surface flex items-center justify-center transition-colors border border-white/10"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="glass-panel hover:glass-panel-elevated p-4 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 border border-white/10 hover:border-primary-container/40" data-id="${o.id}">
      <div class="flex items-center gap-4">
        ${avatarHtml}
        <div>
          <h4 class="font-headline font-semibold text-white text-sm group-hover:text-primary-container transition-colors leading-tight">
            ${o.first || ''} ${o.last || ''}
          </h4>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-[#7BD0FF] font-sans font-medium">${o.role || ''}</span>
            ${o.dept ? `<span class="text-[10px] text-slate-400 font-sans px-2 py-0.5 rounded bg-white/5 border border-white/10">${o.dept}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${actions}
      </div>
    </div>
  `;
}

/**
 * Officer Detail Modal
 */
function openModal(id: string) {
  const o = allOfficers.find(x => x.id === id);
  if (!o) return;

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalRole = document.getElementById('modalRole');
  const modalBody = document.getElementById('modalBody');

  if (!modalBackdrop) return;

  const ini = getInitials(o);
  if (modalAvatar) {
    modalAvatar.innerHTML = o.photo
      ? `<img src="${o.photo}" alt="${o.first}" class="w-24 h-24 rounded-full object-cover border-4 border-primary-container shadow-glow mx-auto mb-3" onerror="this.outerHTML='<div class=\\'w-24 h-24 rounded-full bg-surface-lowest border-4 border-primary-container flex items-center justify-center text-primary-container font-headline font-bold text-3xl mx-auto mb-3\\'>${ini}</div>'"/>`
      : `<div class="w-24 h-24 rounded-full bg-surface-lowest border-4 border-primary-container flex items-center justify-center text-primary-container font-headline font-bold text-3xl mx-auto mb-3">${ini}</div>`;
  }

  if (modalName) modalName.textContent = `${o.first || ''} ${o.last || ''}`.trim();
  if (modalRole) modalRole.textContent = o.role || '';

  if (modalBody) {
    const rows = [];
    if (o.dept) {
      rows.push(`
        <div class="mb-4">
          <div class="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 mb-1">Standing Committee</div>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-sans font-semibold bg-primary-container/15 text-primary-container border border-primary-container/30">${o.dept}</span>
        </div>
      `);
    }

    if (o.bio) {
      rows.push(`<p class="text-sm text-slate-300 font-light leading-relaxed mb-4">${o.bio}</p>`);
    }

    if (o.email) {
      rows.push(`
        <div class="flex items-center gap-2.5 text-xs text-slate-300 mb-2">
          <svg class="w-4 h-4 text-primary-container flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <a href="mailto:${o.email}" class="hover:text-primary-container transition-colors">${o.email}</a>
        </div>
      `);
    }

    if (o.fb) {
      rows.push(`
        <div class="flex items-center gap-2.5 text-xs text-slate-300">
          <svg class="w-4 h-4 text-primary-container flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          <a href="${o.fb}" target="_blank" rel="noopener noreferrer" class="hover:text-primary-container transition-colors">Facebook Profile</a>
        </div>
      `);
    }

    modalBody.innerHTML = rows.join('') || '<p class="text-xs text-slate-500 italic">No additional information recorded.</p>';
  }

  modalBackdrop.classList.remove('hidden');
  modalBackdrop.classList.add('flex');
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', `?officer=${id}`);
}

function closeModal() {
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.add('hidden');
    modalBackdrop.classList.remove('flex');
  }
  document.body.style.overflow = '';
  history.replaceState(null, '', 'directory.html');
}

/**
 * Event Listeners
 */
function initListeners() {
  const searchInput = document.getElementById('searchInput');
  const committeeFilter = document.getElementById('committeeFilter');
  searchInput?.addEventListener('input', render);
  committeeFilter?.addEventListener('change', render);

  const btnGrid = document.getElementById('btnGrid');
  const btnList = document.getElementById('btnList');
  btnGrid?.addEventListener('click', () => {
    viewMode = 'grid';
    btnGrid.classList.add('bg-white/20', 'text-white');
    btnList?.classList.remove('bg-white/20', 'text-white');
    render();
  });
  btnList?.addEventListener('click', () => {
    viewMode = 'list';
    btnList.classList.add('bg-white/20', 'text-white');
    btnGrid?.classList.remove('bg-white/20', 'text-white');
    render();
  });

  const closeModalBtn = document.getElementById('closeModalBtn');
  closeModalBtn?.addEventListener('click', closeModal);

  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/**
 * Bootstrap Directory Page
 */
async function bootstrap() {
  await applyBranding();
  initListeners();
  await loadAll();

  const urlOfficer = new URLSearchParams(window.location.search).get('officer');
  if (urlOfficer) {
    openModal(urlOfficer);
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
