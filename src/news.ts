import './styles/main.css';
import { loadSettings, getAll, COLS, FALLBACK_NEWS } from './firebase';
import type { NewsItem, SiteSettings } from './types';

// State
let allPosts: NewsItem[] = [];
let activeType: string = '';

const typeConfig: Record<string, { label: string; badge: string; emoji: string }> = {
  news: { label: 'News', badge: 'bg-[#1B4FD8]/20 text-[#7BD0FF] border-[#1B4FD8]/35', emoji: '📰' },
  project: { label: 'Project', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', emoji: '💻' },
  editorial: { label: 'Editorial', badge: 'bg-[#F5C518]/15 text-[#F5C518] border-[#F5C518]/30', emoji: '✍️' },
};

/**
 * Apply Branding
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
    navCtaBtn.href = s.ctaLink || 'register.html';
  }

  return s;
}

/**
 * Load posts from Firestore
 */
async function loadPosts() {
  const raw = await getAll<NewsItem>(COLS.NEWS, { orderByField: 'date', orderDir: 'desc' });
  const items = raw.length > 0 ? raw : FALLBACK_NEWS;
  allPosts = items.filter(p => p.status === 'published');

  // Stats
  const statTotal = document.getElementById('statTotal');
  const statNews = document.getElementById('statNews');
  const statProjects = document.getElementById('statProjects');

  if (statTotal) statTotal.textContent = allPosts.length.toString();
  if (statNews) statNews.textContent = allPosts.filter(p => p.type === 'news').length.toString();
  if (statProjects) statProjects.textContent = allPosts.filter(p => p.type === 'project').length.toString();

  // Show content, hide skeleton
  const skeleton = document.getElementById('skeleton');
  const contentWrap = document.getElementById('contentWrap');
  if (skeleton) skeleton.classList.add('hidden');
  if (contentWrap) contentWrap.classList.remove('hidden');

  render();
}

/**
 * Render Posts
 */
function render() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement | null;
  const resultCount = document.getElementById('resultCount');
  const featuredWrap = document.getElementById('featuredWrap');
  const gridLabel = document.getElementById('gridLabel');
  const newsGrid = document.getElementById('newsGrid');

  if (!featuredWrap || !newsGrid) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const sort = sortSelect?.value || 'newest';

  let posts = [...allPosts];

  if (activeType) {
    posts = posts.filter(p => p.type === activeType);
  }

  if (query) {
    posts = posts.filter(p =>
      (p.title || '').toLowerCase().includes(query) ||
      (p.excerpt || '').toLowerCase().includes(query) ||
      (p.author || '').toLowerCase().includes(query) ||
      (p.tags || '').toLowerCase().includes(query)
    );
  }

  // Sort
  if (sort === 'newest') {
    posts.sort((a, b) => (b.date || b.createdAt || '') > (a.date || a.createdAt || '') ? 1 : -1);
  } else if (sort === 'oldest') {
    posts.sort((a, b) => (a.date || a.createdAt || '') > (b.date || b.createdAt || '') ? 1 : -1);
  } else if (sort === 'alpha') {
    posts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  if (resultCount) {
    resultCount.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;
  }

  if (posts.length === 0) {
    featuredWrap.innerHTML = '';
    if (gridLabel) gridLabel.classList.add('hidden');
    newsGrid.innerHTML = `
      <div class="col-span-full glass-panel p-12 rounded-2xl text-center border border-white/10 my-8">
        <div class="text-4xl mb-3">📰</div>
        <h3 class="text-lg font-headline font-semibold text-white">
          ${query ? 'No matching posts found' : 'No publications yet'}
        </h3>
        <p class="text-sm text-slate-400 mt-1 max-w-sm mx-auto font-light">
          ${query ? `Nothing matched "${query}". Try another search keyword.` : 'Articles, project highlights, and editorials will appear here once published.'}
        </p>
      </div>
    `;
    return;
  }

  // Show featured card when no search/filter active
  const showFeatured = !query && !activeType && sort === 'newest' && posts.length > 0;
  let gridPosts = posts;

  if (showFeatured) {
    const featured = posts[0];
    featuredWrap.innerHTML = renderFeaturedCard(featured);
    gridPosts = posts.slice(1);
    featuredWrap.querySelector('[data-id]')?.addEventListener('click', () => openModal(featured.id));
  } else {
    featuredWrap.innerHTML = '';
  }

  if (gridPosts.length > 0) {
    if (gridLabel) {
      gridLabel.classList.remove('hidden');
      gridLabel.textContent = showFeatured ? 'More Publications & Research' : (activeType ? `${typeConfig[activeType]?.label || activeType} Publications` : 'All Publications');
    }
    newsGrid.innerHTML = gridPosts.map(renderNewsCard).join('');
    newsGrid.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) openModal(id);
      });
    });
  } else {
    if (gridLabel) gridLabel.classList.add('hidden');
    newsGrid.innerHTML = '';
  }
}

function renderFeaturedCard(p: NewsItem): string {
  const cfg = typeConfig[p.type] || typeConfig.news;
  const dateFormatted = p.date
    ? new Date(p.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const coverHtml = p.cover
    ? `<img src="${p.cover}" alt="${p.title}" class="w-full h-72 md:h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.outerHTML='<div class=\\'w-full h-72 md:h-full bg-surface-lowest flex items-center justify-center text-5xl\\'>${cfg.emoji}</div>'"/>`
    : `<div class="w-full h-72 md:h-full bg-surface-lowest flex items-center justify-center text-6xl">${cfg.emoji}</div>`;

  return `
    <div class="glass-panel hover:glass-panel-elevated rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group grid grid-cols-1 md:grid-cols-2 border border-white/10 hover:border-primary-container/40 mb-10" data-id="${p.id}">
      <div class="overflow-hidden relative">
        ${coverHtml}
        <div class="absolute inset-0 bg-gradient-to-t from-surface-lowest via-transparent to-transparent opacity-80 md:hidden"></div>
      </div>
      <div class="p-8 md:p-10 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <span class="px-3 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-wider border ${cfg.badge} backdrop-blur-md">
              Featured &bull; ${cfg.label}
            </span>
          </div>
          <h2 class="text-2xl md:text-3xl font-headline font-bold text-white group-hover:text-primary-container transition-colors leading-tight">
            ${p.title || 'Untitled Post'}
          </h2>
          <p class="text-sm md:text-base text-slate-300 mt-4 font-light leading-relaxed line-clamp-3">
            ${p.excerpt || ''}
          </p>
        </div>
        <div class="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
          <div class="text-xs text-slate-400 font-sans">
            ${p.author ? `<span>By ${p.author}</span> &bull; ` : ''}
            <span>${dateFormatted}</span>
          </div>
          <span class="text-xs font-sans font-semibold text-primary-container group-hover:text-white transition-colors flex items-center gap-1.5">
            <span>Read Publication</span>
            <span class="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderNewsCard(p: NewsItem): string {
  const cfg = typeConfig[p.type] || typeConfig.news;
  const dateFormatted = p.date
    ? new Date(p.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  const tags = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const coverHtml = p.cover
    ? `<img src="${p.cover}" alt="${p.title}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.outerHTML='<div class=\\'w-full h-48 bg-surface-lowest flex items-center justify-center text-3xl\\'>${cfg.emoji}</div>'"/>`
    : `<div class="w-full h-48 bg-surface-lowest flex items-center justify-center text-4xl">${cfg.emoji}</div>`;

  return `
    <div class="glass-panel hover:glass-panel-elevated rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer group flex flex-col justify-between border border-white/10 hover:border-primary-container/40" data-id="${p.id}">
      <div>
        <div class="overflow-hidden relative">
          ${coverHtml}
          <div class="absolute inset-0 bg-gradient-to-t from-surface-lowest via-transparent to-transparent opacity-80"></div>
          <span class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider border ${cfg.badge} backdrop-blur-md">
            ${cfg.label}
          </span>
        </div>
        <div class="p-5">
          <div class="text-xs text-slate-400 font-sans mb-2 flex items-center gap-2">
            <span>${dateFormatted}</span>
            ${p.author ? `<span>&bull;</span><span>${p.author}</span>` : ''}
          </div>
          <h3 class="text-lg font-headline font-semibold text-white group-hover:text-primary-container transition-colors leading-snug line-clamp-2">
            ${p.title || 'Untitled'}
          </h3>
          <p class="text-sm text-slate-400 mt-2 line-clamp-2 font-light">
            ${p.excerpt || ''}
          </p>
        </div>
      </div>
      <div class="px-5 pb-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 overflow-hidden">
          ${tags.slice(0, 2).map(t => `<span class="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-sans text-[10px] border border-white/10 truncate">#${t}</span>`).join('')}
        </div>
        <span class="text-primary-container font-sans font-semibold group-hover:text-white transition-colors flex-shrink-0 ml-2">Read &rarr;</span>
      </div>
    </div>
  `;
}

/**
 * Post Modal View
 */
function openModal(id: string) {
  const p = allPosts.find(x => x.id === id);
  if (!p) return;

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalCover = document.getElementById('modalCover');
  const modalMeta = document.getElementById('modalMeta');
  const modalTitle = document.getElementById('modalTitle');
  const modalByline = document.getElementById('modalByline');
  const modalBody = document.getElementById('modalBody');
  const modalTags = document.getElementById('modalTags');
  const modalFooter = document.getElementById('modalFooter');

  if (!modalBackdrop) return;

  const cfg = typeConfig[p.type] || typeConfig.news;
  const dateFormatted = p.date
    ? new Date(p.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  if (modalCover) {
    modalCover.innerHTML = p.cover
      ? `<img src="${p.cover}" alt="${p.title}" class="w-full h-64 md:h-80 object-cover" onerror="this.outerHTML='<div class=\\'w-full h-44 bg-surface-lowest flex items-center justify-center text-5xl\\'>${cfg.emoji}</div>'"/>`
      : `<div class="w-full h-44 bg-surface-lowest flex items-center justify-center text-5xl">${cfg.emoji}</div>`;
  }

  if (modalMeta) {
    modalMeta.innerHTML = `
      <span class="px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold uppercase tracking-wider border ${cfg.badge}">
        ${cfg.label}
      </span>
      <span class="text-xs text-slate-400 font-sans">${dateFormatted}</span>
    `;
  }

  if (modalTitle) modalTitle.textContent = p.title || 'Untitled Post';

  if (modalByline) {
    modalByline.textContent = p.author ? `Published by ${p.author}` : '';
    modalByline.style.display = p.author ? 'block' : 'none';
  }

  if (modalBody) {
    if (p.body) {
      const hasHtml = /<[a-z][\s\S]*>/i.test(p.body);
      modalBody.innerHTML = hasHtml
        ? p.body
        : p.body.split('\n').filter(l => l.trim()).map(l => `<p class="mb-4 text-slate-300 font-light leading-relaxed">${l}</p>`).join('');
    } else if (p.excerpt) {
      modalBody.innerHTML = `<p class="text-slate-300 font-light leading-relaxed">${p.excerpt}</p>`;
    } else {
      modalBody.innerHTML = '<p class="text-slate-500 italic">No content available.</p>';
    }
  }

  if (modalTags) {
    const tags = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    modalTags.innerHTML = tags.map(t => `<span class="px-2.5 py-1 rounded-md bg-white/5 text-slate-300 font-sans text-xs border border-white/10">#${t}</span>`).join('');
    modalTags.style.display = tags.length ? 'flex' : 'none';
  }

  if (modalFooter) {
    modalFooter.innerHTML = p.link
      ? `<a href="${p.link}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary-hover text-surface font-headline font-bold text-xs tracking-wider uppercase transition-all duration-200">Visit Project / Article Link &rarr;</a>
         <button id="closeModalBtn" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-sans text-xs border border-white/10 transition-colors">Close</button>`
      : `<button id="closeModalBtn" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-sans text-xs border border-white/10 transition-colors">Close</button>`;

    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  }

  modalBackdrop.classList.remove('hidden');
  modalBackdrop.classList.add('flex');
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', `?post=${id}`);
}

function closeModal() {
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.add('hidden');
    modalBackdrop.classList.remove('flex');
  }
  document.body.style.overflow = '';
  history.replaceState(null, '', 'news.html');
}

/**
 * Event Listeners
 */
function initListeners() {
  // Tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('bg-primary-container', 'text-surface', 'font-bold');
        t.classList.add('bg-white/5', 'text-slate-300');
      });
      tab.classList.add('bg-primary-container', 'text-surface', 'font-bold');
      tab.classList.remove('bg-white/5', 'text-slate-300');

      activeType = tab.getAttribute('data-type') || '';
      render();
    });
  });

  // Search & Sort
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  searchInput?.addEventListener('input', render);
  sortSelect?.addEventListener('change', render);

  // Modal Backdrop
  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/**
 * Bootstrap News Page
 */
async function bootstrap() {
  await applyBranding();
  initListeners();
  await loadPosts();

  const urlPost = new URLSearchParams(window.location.search).get('post');
  if (urlPost) {
    openModal(urlPost);
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
