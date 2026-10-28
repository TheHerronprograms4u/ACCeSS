import './styles/main.css';
import { loadSettings, getAll, COLS, FALLBACK_EVENTS, FALLBACK_NEWS, FALLBACK_OFFICERS, FALLBACK_TERMS } from './firebase';
import type { EventItem, NewsItem, Officer, Term, SiteSettings } from './types';

// State
let siteSettings: SiteSettings;

/**
 * Apply dynamic branding and site settings
 */
async function initBranding(): Promise<SiteSettings> {
  siteSettings = await loadSettings();

  // Root CSS custom properties
  const root = document.documentElement;
  if (siteSettings.colorPrimary) root.style.setProperty('--blue', siteSettings.colorPrimary);
  if (siteSettings.colorAccent)  root.style.setProperty('--yellow', siteSettings.colorAccent);

  // Logo images
  const logo = siteSettings.logoUrl || 'landing-page-imgs/ACCeSS-Logo.png';
  ['navLogo', 'heroLogo', 'footerLogo'].forEach(id => {
    const el = document.getElementById(id) as HTMLImageElement | null;
    if (el) {
      el.src = logo;
      el.style.display = 'block';
    }
  });

  // Text contents
  setText('navBrandName', siteSettings.siteName || 'BU ACCeSS');
  setText('footerName', siteSettings.siteName || 'BU ACCeSS');
  setText('heroEyebrow', siteSettings.college || 'Bicol University — College of Science');
  
  if (siteSettings.heroHeadline) {
    const heroH1 = document.getElementById('heroH1');
    if (heroH1) {
      let h = siteSettings.heroHeadline;
      if (h.includes('text-primary-container')) {
        h = h.replace(/text-primary-container/g, 'text-[#F5C518]');
      }
      heroH1.innerHTML = h;
    }
  }
  
  setText('heroSub', siteSettings.heroSub || 'Empowering CS students through community, sustainable development, and meaningful experiences since 2015.');
  setText('missionText', siteSettings.mission || 'The Academic Consortium of Computer Science Students shall promote the sustainable development of Computer Science in Bicol University.');
  setText('footerDesc', siteSettings.about || 'The Academic Consortium of Computer Science Students is the official College Based Organization of the CS students of the College of Science, Bicol University.');

  // Year
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  // Hero BG
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    if (siteSettings.heroBg) {
      heroBg.style.backgroundImage = `url('${siteSettings.heroBg}')`;
    } else {
      heroBg.classList.add('hero-bg-fallback');
    }
  }

  // Mission photo
  const missionPhoto = document.getElementById('missionPhoto');
  if (missionPhoto && siteSettings.heroBg) {
    missionPhoto.style.backgroundImage = `url('${siteSettings.heroBg}')`;
  }

  // CTAs
  setLink('heroCtaBtn', siteSettings.ctaLink || 'register.html', siteSettings.ctaLabel || 'Join the Org');
  setLink('navCtaBtn', siteSettings.ctaLink || 'register.html', siteSettings.ctaLabel || 'Join Us');
  setLink('bannerCtaBtn', siteSettings.ctaLink || 'register.html', siteSettings.ctaLabel || 'Apply for Membership');

  // Social links
  renderSocials(siteSettings);
  renderContact(siteSettings);

  // Feature sections visibility
  if (siteSettings.showCounter === false) {
    const cw = document.getElementById('counterWrap');
    if (cw) cw.style.display = 'none';
  }

  return siteSettings;
}

/**
 * Render Upcoming Events
 */
async function renderUpcomingEvents(show: boolean = true) {
  if (!show) return;
  const eventsEl = document.getElementById('eventsEl');
  const sectionEl = document.getElementById('eventsSection');
  if (!eventsEl || !sectionEl) return;

  const raw = await getAll<EventItem>(COLS.EVENTS, { orderByField: 'date', orderDir: 'asc' });
  const all = raw.length > 0 ? raw : FALLBACK_EVENTS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = all.filter(e => {
    if (e.status === 'draft' || !e.date) return false;
    return new Date(e.date) >= today;
  }).slice(0, 4);

  const listToRender = upcoming.length > 0 ? upcoming : all.slice(0, 4);

  if (listToRender.length === 0) {
    sectionEl.classList.add('hidden');
    return;
  }
  sectionEl.classList.remove('hidden');

  eventsEl.innerHTML = listToRender.map(e => {
    const d = new Date(e.date!);
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const dateFormatted = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const isOngoing = e.status === 'ongoing';

    return `
      <div class="glass-panel hover:glass-panel-elevated p-5 rounded-2xl transition-all duration-300 group flex flex-col md:flex-row md:items-center justify-between gap-5 border border-white/10 hover:border-secondary/40">
        <div class="flex items-start sm:items-center gap-4">
          <div class="w-16 h-16 rounded-xl bg-surface-lowest border border-primary-container/30 flex flex-col items-center justify-center flex-shrink-0 group-hover:border-primary-container transition-colors shadow-inner">
            <span class="text-[10px] font-mono font-bold tracking-wider text-primary-container">${month}</span>
            <span class="text-2xl font-headline font-bold text-white">${day}</span>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                isOngoing ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-secondary/15 text-secondary border border-secondary/30'
              }">${e.status || 'Upcoming'}</span>
              ${e.category ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">${e.category}</span>` : ''}
            </div>
            <h3 class="text-lg font-headline font-semibold text-white group-hover:text-primary-container transition-colors leading-snug">
              ${e.title}
            </h3>
            <p class="text-sm text-slate-400 mt-1 line-clamp-1 max-w-xl font-light">
              ${e.desc || ''}
            </p>
            <div class="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <span class="inline-flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/></svg>
                ${dateFormatted}
              </span>
              ${e.location ? `
                <span class="inline-flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" stroke-width="2"/></svg>
                  ${e.location}
                </span>` : ''
              }
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 self-end md:self-center">
          <a href="events.html?event=${e.id}" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-secondary/20 text-secondary hover:text-white border border-secondary/30 text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5">
            <span>View Details</span>
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Latest News & Projects
 */
async function renderLatestNews(show: boolean = true) {
  if (!show) return;
  const newsEl = document.getElementById('newsEl');
  const sectionEl = document.getElementById('newsSection');
  if (!newsEl || !sectionEl) return;

  const raw = await getAll<NewsItem>(COLS.NEWS, { orderByField: 'date', orderDir: 'desc' });
  const all = raw.length > 0 ? raw : FALLBACK_NEWS;
  const published = all.filter(p => p.status === 'published').slice(0, 3);
  const listToRender = published.length > 0 ? published : all.slice(0, 3);

  if (listToRender.length === 0) {
    sectionEl.classList.add('hidden');
    return;
  }
  sectionEl.classList.remove('hidden');

  const typeConfig: Record<string, { badge: string; emoji: string }> = {
    news: { badge: 'bg-secondary/15 text-secondary border-secondary/30', emoji: '📰' },
    project: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', emoji: '💻' },
    editorial: { badge: 'bg-primary-container/15 text-primary-container border-primary-container/30', emoji: '✍️' },
  };

  newsEl.innerHTML = listToRender.map(item => {
    const dateFormatted = item.date
      ? new Date(item.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    const cfg = typeConfig[item.type] || typeConfig.news;
    const coverHtml = item.cover
      ? `<img src="${item.cover}" alt="${item.title}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.outerHTML='<div class=\\'w-full h-48 bg-surface-lowest flex items-center justify-center text-3xl\\'>${cfg.emoji}</div>'"/>`
      : `<div class="w-full h-48 bg-surface-lowest flex items-center justify-center text-4xl">${cfg.emoji}</div>`;

    return `
      <a href="news.html?post=${item.id}" class="glass-panel hover:glass-panel-elevated rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group border border-white/10 hover:border-secondary/40">
        <div class="overflow-hidden relative">
          ${coverHtml}
          <div class="absolute inset-0 bg-gradient-to-t from-surface-lowest via-transparent to-transparent opacity-80"></div>
          <span class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${cfg.badge} backdrop-blur-md">
            ${item.type || 'news'}
          </span>
        </div>
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div class="text-xs text-slate-400 font-mono mb-2 flex items-center gap-2">
              <span>${dateFormatted}</span>
              ${item.author ? `<span>&bull;</span><span>${item.author}</span>` : ''}
            </div>
            <h3 class="text-lg font-headline font-semibold text-white group-hover:text-primary-container transition-colors leading-snug line-clamp-2">
              ${item.title}
            </h3>
            <p class="text-sm text-slate-400 mt-2 line-clamp-2 font-light">
              ${item.excerpt || ''}
            </p>
          </div>
          <div class="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-secondary group-hover:text-primary-container transition-colors">
            <span>Read Publication</span>
            <span class="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/**
 * Render Executive Officer Directory Preview
 */
async function renderDirectoryPreview(show: boolean = true) {
  if (!show) return;
  const officersEl = document.getElementById('officersEl');
  const sectionEl = document.getElementById('directorySection');
  if (!officersEl || !sectionEl) return;

  const [rawOfficers, rawTerms] = await Promise.all([
    getAll<Officer>(COLS.DIRECTORY),
    getAll<Term>(COLS.TERMS),
  ]);

  const officers = rawOfficers.length > 0 ? rawOfficers : FALLBACK_OFFICERS;
  const terms = rawTerms.length > 0 ? rawTerms : FALLBACK_TERMS;

  if (officers.length === 0) {
    sectionEl.classList.add('hidden');
    return;
  }
  sectionEl.classList.remove('hidden');

  // Find active term
  const validTerms = terms.filter(t => officers.some(o => o.term === t.id));
  const activeTermId = validTerms.length ? validTerms[validTerms.length - 1].id : officers[0]?.term;

  const activeOfficers = officers
    .filter(o => o.term === activeTermId)
    .sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99))
    .slice(0, 8);

  officersEl.innerHTML = activeOfficers.map(o => {
    const initials = ((o.first || '?').charAt(0) + (o.last || '').charAt(0)).toUpperCase();
    const avatarHtml = o.photo
      ? `<img src="${o.photo}" alt="${o.first}" class="w-16 h-16 rounded-full object-cover border-2 border-primary-container/40 group-hover:border-primary-container transition-colors shadow-lg" onerror="this.outerHTML='<div class=\\'w-16 h-16 rounded-full bg-surface-lowest border-2 border-primary-container/40 flex items-center justify-center text-primary-container font-mono font-bold text-lg\\'>${initials}</div>'"/>`
      : `<div class="w-16 h-16 rounded-full bg-surface-lowest border-2 border-primary-container/40 flex items-center justify-center text-primary-container font-mono font-bold text-lg">${initials}</div>`;

    return `
      <div class="glass-panel hover:glass-panel-elevated p-5 rounded-2xl text-center group transition-all duration-300 border border-white/10 hover:border-primary-container/40 flex flex-col items-center">
        <div class="relative mb-3.5">
          ${avatarHtml}
        </div>
        <h4 class="font-headline font-semibold text-white text-sm group-hover:text-primary-container transition-colors leading-tight">
          ${o.first || ''} ${o.last || ''}
        </h4>
        <p class="text-xs text-secondary mt-1 font-mono font-medium leading-tight line-clamp-1">
          ${o.role || ''}
        </p>
        ${o.dept ? `<span class="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono border border-white/10">${o.dept}</span>` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Interactive Visitor Counter
 */
function initVisitorCounter(show: boolean = true) {
  if (!show) return;
  const counterEl = document.getElementById('counterEl');
  if (!counterEl) return;

  const currentCount = (parseInt(localStorage.getItem('access_visitor_count') || '0', 10) || 0) + 1;
  localStorage.setItem('access_visitor_count', currentCount.toString());

  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();

    const duration = 1800;
    let startTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const val = Math.floor(progress * currentCount);
      counterEl.textContent = val.toString().padStart(7, '0');
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, { threshold: 0.2 });

  observer.observe(counterEl);
}

/**
 * Interactive Cyber Terminal Simulator Widget
 */
function initTerminalSimulator() {
  const terminalInput = document.getElementById('terminalInput') as HTMLInputElement | null;
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalModal = document.getElementById('terminalModal');
  const openTerminalBtns = document.querySelectorAll('.open-terminal-btn');
  const closeTerminalBtn = document.getElementById('closeTerminalBtn');

  if (!terminalInput || !terminalOutput || !terminalModal) return;

  const printLine = (text: string, colorClass: string = 'text-slate-300') => {
    const line = document.createElement('div');
    line.className = `font-mono text-xs leading-relaxed ${colorClass}`;
    line.innerHTML = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  };

  const handleCommand = (cmd: string) => {
    const raw = cmd.trim().toLowerCase();
    printLine(`<span class="text-secondary font-bold">access@consortium:~$</span> ${cmd}`, 'text-slate-200');

    if (!raw) return;

    switch (raw) {
      case 'help':
        printLine('Available commands:');
        printLine('  <span class="text-primary-container font-semibold">about</span>      - Overview of BU ACCeSS');
        printLine('  <span class="text-primary-container font-semibold">pillars</span>    - Display the 5 core organizational pillars');
        printLine('  <span class="text-primary-container font-semibold">events</span>     - Link to upcoming student events');
        printLine('  <span class="text-primary-container font-semibold">officers</span>   - Executive board and committees');
        printLine('  <span class="text-primary-container font-semibold">telemetry</span>  - View system and consortium statistics');
        printLine('  <span class="text-primary-container font-semibold">clear</span>      - Clear terminal screen');
        break;

      case 'about':
        printLine('Academic Consortium of Computer Science Students (ACCeSS)');
        printLine('Official College-Based Organization of CS students at Bicol University College of Science.');
        printLine('Founded: 2015 | Legazpi City, Albay, Philippines');
        break;

      case 'pillars':
        printLine('[01] Academic Excellence    - Fostering scholarship, coding bootcamps, and knowledge sharing.');
        printLine('[02] Community Service      - Giving back through civic tech and digital literacy.');
        printLine('[03] Leadership Development - Cultivating resilient engineering leaders.');
        printLine('[04] Innovation & Research  - Advancing computing discovery, hackathons, and software creation.');
        printLine('[05] Sustainability         - Creating enduring foundations across academic generations.');
        break;

      case 'events':
        printLine('Navigating to events calendar... [200 OK]');
        setTimeout(() => { window.location.href = 'events.html'; }, 800);
        break;

      case 'officers':
        printLine('Opening student directory... [200 OK]');
        setTimeout(() => { window.location.href = 'directory.html'; }, 800);
        break;

      case 'telemetry':
        printLine('CONSORTIUM TELEMETRY:');
        printLine('  Total Network Members: 500+');
        printLine('  Active Academic Term: AY 2024-2025');
        printLine('  Node Status: ONLINE (Firestore Cloud v10)');
        printLine('  Latency: 14ms | Engine: Vite + TypeScript');
        break;

      case 'clear':
        terminalOutput.innerHTML = '';
        break;

      default:
        printLine(`Command not found: "${cmd}". Type <span class="text-primary-container">help</span> for a list of commands.`, 'text-rose-400');
    }
  };

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = terminalInput.value;
      terminalInput.value = '';
      handleCommand(val);
    }
  });

  openTerminalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      terminalModal.classList.remove('hidden');
      terminalModal.classList.add('flex');
      terminalInput.focus();
    });
  });

  closeTerminalBtn?.addEventListener('click', () => {
    terminalModal.classList.add('hidden');
    terminalModal.classList.remove('flex');
  });

  terminalModal.addEventListener('click', (e) => {
    if (e.target === terminalModal) {
      terminalModal.classList.add('hidden');
      terminalModal.classList.remove('flex');
    }
  });

  // Shortcut Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      terminalModal.classList.toggle('hidden');
      terminalModal.classList.toggle('flex');
      if (!terminalModal.classList.contains('hidden')) {
        terminalInput.focus();
      }
    } else if (e.key === 'Escape' && !terminalModal.classList.contains('hidden')) {
      terminalModal.classList.add('hidden');
      terminalModal.classList.remove('flex');
    }
  });
}

/**
 * Mobile Navigation Toggle
 */
function initNavigation() {
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Active section scroll spy
  const sections = document.querySelectorAll('section[id], div[id="about"]');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 100;
    sections.forEach(sec => {
      const el = sec as HTMLElement;
      if (scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
        const id = el.id;
        navLinks.forEach(link => {
          if (link.getAttribute('data-section') === id) {
            link.classList.add('text-primary-container', 'border-primary-container');
            link.classList.remove('text-slate-300', 'border-transparent');
          } else {
            link.classList.remove('text-primary-container', 'border-primary-container');
            link.classList.add('text-slate-300', 'border-transparent');
          }
        });
      }
    });
  });
}

/**
 * Helper Utilities
 */
function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setLink(id: string, href: string, text?: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null;
  if (!el) return;
  if (href) el.href = href;
  if (text) el.textContent = text;
}

function renderSocials(s: SiteSettings) {
  const socialsEl = document.getElementById('footerSocials');
  if (!socialsEl) return;

  const list = [
    { k: 'facebook',  label: 'Facebook',  svg: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>` },
    { k: 'instagram', label: 'Instagram', svg: `<rect width="20" height="20" x="2" y="2" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5"/>` },
    { k: 'twitter',   label: 'Twitter/X',  svg: `<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>` },
    { k: 'discord',   label: 'Discord',   svg: `<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>` },
    { k: 'tiktok',    label: 'TikTok',    svg: `<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.77.61 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 12.67 0V8.69a8.27 8.27 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.06-.1z"/>` },
  ];

  socialsEl.innerHTML = list
    .filter(x => s[x.k])
    .map(x => `
      <a href="${s[x.k]}" target="_blank" rel="noopener noreferrer" aria-label="${x.label}" class="w-9 h-9 rounded-xl bg-surface-lowest hover:bg-primary-container text-slate-400 hover:text-surface-lowest border border-white/10 hover:border-primary-container flex items-center justify-center transition-all duration-200">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">${x.svg}</svg>
      </a>
    `).join('');
}

function renderContact(s: SiteSettings) {
  const contactEl = document.getElementById('footerContact');
  if (!contactEl) return;

  contactEl.innerHTML = [
    s.address ? `
      <div class="flex items-start gap-2.5 text-xs text-slate-400 font-light leading-relaxed">
        <svg class="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3" stroke-width="2"/></svg>
        <span>${s.address}</span>
      </div>` : '',
    s.email ? `
      <div class="flex items-center gap-2.5 text-xs text-slate-400 font-light mt-2">
        <svg class="w-4 h-4 text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <a href="mailto:${s.email}" class="hover:text-primary-container transition-colors">${s.email}</a>
      </div>` : '',
  ].join('');
}

/**
 * Bootstrap Application
 */
async function bootstrap() {
  const settings = await initBranding();
  initNavigation();
  initTerminalSimulator();

  await Promise.all([
    renderUpcomingEvents(settings.showEvents),
    renderLatestNews(settings.showNews),
    renderDirectoryPreview(settings.showDirectory),
  ]);

  initVisitorCounter(settings.showCounter);
}

// Start
document.addEventListener('DOMContentLoaded', bootstrap);
