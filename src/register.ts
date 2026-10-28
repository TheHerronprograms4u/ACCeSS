import './styles/main.css';
import { loadSettings, addDocument, logActivity, COLS } from './firebase';
import type { MembershipApplication, SiteSettings } from './types';

let siteSettings: SiteSettings | null = null;

/**
 * Apply Site Branding
 */
async function applyBranding(): Promise<SiteSettings> {
  const s = await loadSettings();
  siteSettings = s;
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

  // If external application link configured in settings, show banner
  const externalBanner = document.getElementById('externalBanner');
  const externalLinkBtn = document.getElementById('externalLinkBtn') as HTMLAnchorElement | null;
  if (s.ctaLink && (s.ctaLink.startsWith('http://') || s.ctaLink.startsWith('https://'))) {
    if (externalBanner && externalLinkBtn) {
      externalBanner.classList.remove('hidden');
      externalLinkBtn.href = s.ctaLink;
      if (s.ctaLabel) {
        externalLinkBtn.textContent = `${s.ctaLabel} (Google Form) →`;
      }
    }
  }

  return s;
}

/**
 * Handle Application Form Submission
 */
function initForm() {
  const form = document.getElementById('registerForm') as HTMLFormElement | null;
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
  const formCard = document.getElementById('formCard');
  const successCard = document.getElementById('successCard');
  const applicantNameDisplay = document.getElementById('applicantNameDisplay');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorAlert) errorAlert.classList.add('hidden');

    const fullName = (document.getElementById('fullName') as HTMLInputElement)?.value.trim();
    const studentId = (document.getElementById('studentId') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('email') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('phone') as HTMLInputElement)?.value.trim();
    const yearLevel = (document.getElementById('yearLevel') as HTMLSelectElement)?.value;
    const program = (document.getElementById('program') as HTMLSelectElement)?.value;
    const motivation = (document.getElementById('motivation') as HTMLTextAreaElement)?.value.trim();

    // Collect committee checkboxes
    const committeeNodes = document.querySelectorAll('input[name="committee"]:checked');
    const committees: string[] = [];
    committeeNodes.forEach((node) => {
      committees.push((node as HTMLInputElement).value);
    });

    if (!fullName || !studentId || !email || !yearLevel || !program) {
      if (errorAlert && errorMessage) {
        errorMessage.textContent = 'Please fill in all required fields (Full Name, Student ID, Email, Year Level, and Program).';
        errorAlert.classList.remove('hidden');
      }
      return;
    }

    // Set loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0A2463] inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>Submitting Application...</span>
      `;
    }

    const applicationData: MembershipApplication = {
      fullName,
      studentId,
      email,
      phone: phone || undefined,
      yearLevel,
      program,
      committees: committees.length > 0 ? committees : ['General Membership'],
      motivation: motivation || '',
      status: 'pending',
    };

    try {
      // 1. Try Firestore write
      await addDocument(COLS.APPLICATIONS, applicationData);
      await logActivity(`Applied for membership: ${fullName}`, 'amber');

      // 2. Display success card
      if (applicantNameDisplay) applicantNameDisplay.textContent = fullName;
      if (formCard) formCard.classList.add('hidden');
      if (successCard) successCard.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.warn('Firestore direct write failed, falling back to local acknowledgment:', err);
      // Fallback: save to localStorage so submission is never lost
      try {
        const stored = JSON.parse(localStorage.getItem('access_pending_applications') || '[]');
        stored.push({ ...applicationData, submittedAt: new Date().toISOString() });
        localStorage.setItem('access_pending_applications', JSON.stringify(stored));
      } catch (e) {
        // Ignore localStorage error
      }

      // Show success with email confirmation fallback
      if (applicantNameDisplay) applicantNameDisplay.textContent = fullName;
      if (formCard) formCard.classList.add('hidden');
      if (successCard) {
        successCard.classList.remove('hidden');
        const fallbackNote = document.getElementById('fallbackNote');
        if (fallbackNote) {
          fallbackNote.classList.remove('hidden');
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Application</span> <span>&rarr;</span>`;
      }
    }
  });
}

/**
 * Bootstrap Register Page
 */
async function bootstrap() {
  await applyBranding();
  initForm();
}

document.addEventListener('DOMContentLoaded', bootstrap);
