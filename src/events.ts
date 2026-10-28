import './styles/main.css';
import { loadSettings, getAll, COLS, FALLBACK_EVENTS } from './firebase';
import type { EventItem, SiteSettings } from './types';

// State
let allEvents: EventItem[] = [];
let activeFilter: 'all' | 'upcoming' | 'ongoing' | 'past' = 'all';
let viewMode: 'list' | 'grid' = 'list';

/**
 * Determine dynamic event status
 */
function computeStatus(e: EventItem): 'upcoming' | 'ongoing' | 'past' {
  if (!e.date) return (e.status as any) || 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(e.date);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate > today) return 'upcoming';
  if (eventDate.getTime() === today.getTime()) return 'ongoing';
  return 'past';
}

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
 * Load events from Firestore
 */
async function loadEvents() {
  const raw = await getAll<EventItem>(COLS.EVENTS);
  const items = raw.length > 0 ? raw : FALLBACK_EVENTS;
  allEvents = items
    .filter(e => e.status !== 'draft')
    .map(e => ({ ...e, _s: computeStatus(e) }));

  // Update hero stats
  const statTotal = document.getElementById('statTotal');
  const statUpcoming = document.getElementById('statUpcoming');
  const statOngoing = document.getElementById('statOngoing');

  if (statTotal) statTotal.textContent = allEvents.length.toString();
  if (statUpcoming) statUpcoming.textContent = allEvents.filter(e => e._s === 'upcoming').length.toString();
  if (statOngoing) statOngoing.textContent = allEvents.filter(e => e._s === 'ongoing').length.toString();

  // Hide skeleton, show output
  const skeleton = document.getElementById('skeleton');
  const output = document.getElementById('eventsOutput');
  if (skeleton) skeleton.classList.add('hidden');
  if (output) output.classList.remove('hidden');

  render();
}

/**
 * Render Events List / Grid
 */
function render() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement | null;
  const resultCount = document.getElementById('resultCount');
  const output = document.getElementById('eventsOutput');

  if (!output) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const sort = sortSelect?.value || 'date-asc';

  let filtered = [...allEvents];

  if (activeFilter !== 'all') {
    filtered = filtered.filter(e => e._s === activeFilter);
  }

  if (query) {
    filtered = filtered.filter(e =>
      (e.title || '').toLowerCase().includes(query) ||
      (e.desc || '').toLowerCase().includes(query) ||
      (e.location || '').toLowerCase().includes(query) ||
      (e.category || '').toLowerCase().includes(query)
    );
  }

  // Sort
  if (sort === 'date-asc') {
    filtered.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
  } else if (sort === 'date-desc') {
    filtered.sort((a, b) => (a.date || '') > (b.date || '') ? -1 : 1);
  } else if (sort === 'alpha') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  if (resultCount) {
    resultCount.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    output.innerHTML = `
      <div class="glass-panel p-12 rounded-2xl text-center border border-white/10 my-8">
        <div class="text-4xl mb-3">📅</div>
        <h3 class="text-lg font-headline font-semibold text-white">
          ${query ? 'No matching events found' : activeFilter === 'all' ? 'No events yet' : `No ${activeFilter} events`}
        </h3>
        <p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto font-light">
          ${query ? `Nothing matched "${query}". Try searching for another topic.` : 'Events will appear here once scheduled by the organization.'}
        </p>
      </div>
    `;
    return;
  }

  if (viewMode === 'list') {
    output.innerHTML = `<div class="flex flex-col gap-4">${filtered.map(renderListCard).join('')}</div>`;
  } else {
    output.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${filtered.map(renderGridCard).join('')}</div>`;
  }

  // Attach card click handlers for modal
  output.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (id) openModal(id);
    });
  });
}

function renderListCard(e: EventItem): string {
  const d = e.date ? new Date(e.date) : null;
  const month = d ? d.toLocaleString('default', { month: 'short' }).toUpperCase() : '—';
  const day = d ? d.getDate() : '—';
  const dateFormatted = d ? d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const cover = e.image
    ? `<img src="${e.image}" alt="${e.title}" class="w-32 h-32 md:w-36 md:h-36 object-cover rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300" onerror="this.outerHTML='<div class=\\'w-32 h-32 md:w-36 md:h-36 rounded-xl bg-surface-lowest flex items-center justify-center text-3xl\\'>📅</div>'"/>`
    : `<div class="w-32 h-32 md:w-36 md:h-36 rounded-xl bg-surface-lowest flex items-center justify-center text-3xl flex-shrink-0">📅</div>`;

  return `
    <div class="glass-panel hover:glass-panel-elevated p-5 rounded-2xl transition-all duration-300 cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-white/10 hover:border-primary-container/40" data-id="${e.id}">
      <div class="flex items-start gap-5">
        <div class="w-16 h-16 rounded-xl bg-surface-lowest border border-primary-container/30 flex flex-col items-center justify-center flex-shrink-0 group-hover:border-primary-container transition-colors">
          <span class="text-[10px] font-sans font-bold tracking-wider text-primary-container">${month}</span>
          <span class="text-2xl font-headline font-bold text-white">${day}</span>
        </div>
        <div>
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            ${badgeHTML(e._s)}
            ${e.category ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">${e.category}</span>` : ''}
          </div>
          <h3 class="text-lg font-headline font-semibold text-white group-hover:text-primary-container transition-colors leading-snug">
            ${e.title || 'Untitled'}
          </h3>
          <p class="text-sm text-slate-400 mt-1 line-clamp-2 max-w-xl font-light">
            ${e.desc || ''}
          </p>
          <div class="flex items-center gap-4 mt-2.5 text-xs text-slate-400 flex-wrap">
            ${dateFormatted ? `<span class="inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/></svg>${dateFormatted}${e.time ? ' &bull; ' + e.time : ''}</span>` : ''}
            ${e.location ? `<span class="inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" stroke-width="2"/></svg>${e.location}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="hidden sm:block">
        ${cover}
      </div>
    </div>
  `;
}

function renderGridCard(e: EventItem): string {
  const d = e.date ? new Date(e.date) : null;
  const month = d ? d.toLocaleString('default', { month: 'short' }).toUpperCase() : '';
  const day = d ? d.getDate() : '';
  const dateFormatted = d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const cover = e.image
    ? `<img src="${e.image}" alt="${e.title}" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.outerHTML='<div class=\\'w-full h-44 bg-surface-lowest flex items-center justify-center text-3xl\\'>📅</div>'"/>`
    : `<div class="w-full h-44 bg-surface-lowest flex items-center justify-center text-4xl">📅</div>`;

  return `
    <div class="glass-panel hover:glass-panel-elevated rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer group flex flex-col justify-between border border-white/10 hover:border-primary-container/40" data-id="${e.id}">
      <div>
        <div class="overflow-hidden relative">
          ${cover}
          <div class="absolute inset-0 bg-gradient-to-t from-surface-lowest via-transparent to-transparent opacity-80"></div>
          <div class="absolute top-3 left-3 flex items-center gap-2">
            ${badgeHTML(e._s)}
            ${e.category ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-surface/80 text-slate-300 border border-white/10 backdrop-blur-md">${e.category}</span>` : ''}
          </div>
          <div class="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-sans font-semibold text-primary-container bg-surface-lowest/90 px-2.5 py-1 rounded-lg border border-primary-container/20 backdrop-blur-md">
            <span>${month} ${day}</span>
          </div>
        </div>
        <div class="p-5">
          <h3 class="text-lg font-headline font-semibold text-white group-hover:text-primary-container transition-colors leading-snug line-clamp-2">
            ${e.title || 'Untitled'}
          </h3>
          <p class="text-sm text-slate-400 mt-2 line-clamp-2 font-light">
            ${e.desc || ''}
          </p>
        </div>
      </div>
      <div class="px-5 pb-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span class="inline-flex items-center gap-1.5 truncate max-w-[180px]">
          <svg class="w-3.5 h-3.5 text-primary-container flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" stroke-width="2"/></svg>
          ${e.location || 'Location TBA'}
        </span>
        <span class="text-primary-container font-sans font-semibold group-hover:text-white transition-colors">Details &rarr;</span>
      </div>
    </div>
  `;
}

function badgeHTML(status?: string): string {
  if (status === 'ongoing') {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Ongoing</span>`;
  }
  if (status === 'past') {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">Past</span>`;
  }
  return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-[#1B4FD8]/20 text-[#7BD0FF] border border-[#1B4FD8]/40">Upcoming</span>`;
}

/**
 * Event Detail Modal
 */
function openModal(id: string) {
  const e = allEvents.find(x => x.id === id);
  if (!e) return;

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalCover = document.getElementById('modalCover');
  const modalMeta = document.getElementById('modalMeta');
  const modalTitle = document.getElementById('modalTitle');
  const modalDetails = document.getElementById('modalDetails');
  const modalDesc = document.getElementById('modalDesc');
  const modalActions = document.getElementById('modalActions');

  if (!modalBackdrop) return;

  if (modalCover) {
    modalCover.innerHTML = e.image
      ? `<img src="${e.image}" alt="${e.title}" class="w-full h-56 object-cover" onerror="this.outerHTML='<div class=\\'w-full h-40 bg-surface-lowest flex items-center justify-center text-4xl\\'>📅</div>'"/>`
      : `<div class="w-full h-40 bg-surface-lowest flex items-center justify-center text-4xl">📅</div>`;
  }

  if (modalMeta) {
    modalMeta.innerHTML = badgeHTML(e._s) + (e.category ? ` <span class="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">${e.category}</span>` : '');
  }

  if (modalTitle) modalTitle.textContent = e.title || 'Untitled Event';

  if (modalDetails) {
    const d = e.date ? new Date(e.date) : null;
    const dateFormatted = d ? d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const rows = [];
    if (dateFormatted) {
      rows.push(`<div class="flex items-center gap-2 text-xs text-slate-300"><span class="font-sans text-primary-container font-semibold">Date:</span> <span>${dateFormatted}${e.time ? ' at ' + e.time : ''}</span></div>`);
    }
    if (e.location) {
      rows.push(`<div class="flex items-center gap-2 text-xs text-slate-300"><span class="font-sans text-primary-container font-semibold">Venue:</span> <span>${e.location}</span></div>`);
    }
    modalDetails.innerHTML = rows.join('');
  }

  if (modalDesc) {
    modalDesc.textContent = e.desc || 'No detailed description provided.';
  }

  if (modalActions) {
    modalActions.innerHTML = e.link
      ? `<a href="${e.link}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary-hover text-surface font-headline font-bold text-xs tracking-wider uppercase transition-all duration-200">Register / Learn More &rarr;</a>
         <button id="closeModalBtn" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-sans text-xs border border-white/10 transition-colors">Close</button>`
      : `<button id="closeModalBtn" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-sans text-xs border border-white/10 transition-colors">Close</button>`;

    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  }

  modalBackdrop.classList.remove('hidden');
  modalBackdrop.classList.add('flex');
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', `?event=${id}`);
}

function closeModal() {
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.add('hidden');
    modalBackdrop.classList.remove('flex');
  }
  document.body.style.overflow = '';
  history.replaceState(null, '', 'events.html');
}

/**
 * Wire Event Listeners
 */
function initListeners() {
  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('bg-primary-container', 'text-surface', 'font-bold');
        t.classList.add('bg-white/5', 'text-slate-300');
      });
      tab.classList.add('bg-primary-container', 'text-surface', 'font-bold');
      tab.classList.remove('bg-white/5', 'text-slate-300');

      activeFilter = tab.getAttribute('data-filter') as any || 'all';
      render();
    });
  });

  // Search input & sort
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  searchInput?.addEventListener('input', render);
  sortSelect?.addEventListener('change', render);

  // View toggle
  const btnList = document.getElementById('btnList');
  const btnGrid = document.getElementById('btnGrid');
  btnList?.addEventListener('click', () => {
    viewMode = 'list';
    btnList.classList.add('bg-white/20', 'text-white');
    btnGrid?.classList.remove('bg-white/20', 'text-white');
    render();
  });
  btnGrid?.addEventListener('click', () => {
    viewMode = 'grid';
    btnGrid.classList.add('bg-white/20', 'text-white');
    btnList?.classList.remove('bg-white/20', 'text-white');
    render();
  });

  // Modal backdrop click
  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/**
 * Bootstrap Events Page
 */
async function bootstrap() {
  await applyBranding();
  initListeners();
  await loadEvents();

  // Check URL query param
  const urlEvent = new URLSearchParams(window.location.search).get('event');
  if (urlEvent) {
    openModal(urlEvent);
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
