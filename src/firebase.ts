/**
 * Type-Safe Firebase Service Module for BU ACCeSS
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  Firestore,
  DocumentData,
  Unsubscribe
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from "firebase/auth";
import type { SiteSettings } from "./types";

// Firebase credentials for BU ACCeSS
const firebaseConfig = {
  apiKey:            "AIzaSyBvR22RrwAuhwlrNgfRZyaWXEOD-uu3qfs",
  authDomain:        "bu-access-wesbite.firebaseapp.com",
  projectId:         "bu-access-wesbite",
  storageBucket:     "bu-access-wesbite.firebasestorage.app",
  messagingSenderId: "1072015753651",
  appId:             "1:1072015753651:web:023be3458965a4f7040bc6"
};

// Initialize
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Collection constants
export const COLS = {
  EVENTS:    "events",
  NEWS:      "news",
  DIRECTORY: "directory",
  TERMS:     "terms",
  SETTINGS:  "settings",
  ACTIVITY:  "activity",
} as const;

export const SETTINGS_DEFAULTS: SiteSettings = {
  logoUrl:      'landing-page-imgs/ACCeSS-Logo.png',
  siteName:     'BU ACCeSS',
  siteTagline:  'Academic Consortium of Computer Science Students',
  colorPrimary: '#0A2463',
  colorAccent:  '#F5C518',
  colorText:    '#DBE1FF',
  foundedYear:  '2015',
  college:      'Bicol University — College of Science',
  about:        'The official College Based Organization of the CS students of the College of Science, Bicol University.',
  mission:      'The Academic Consortium of Computer Science Students shall promote the sustainable development of Computer Science in Bicol University.',
  vision:       'ACCeSS members will be empowered to build comprehensive networks and prepare for the future through meaningful experiences.',
  address:      '2nd Floor, College of Science Building 2, Bicol University, Legazpi City',
  email:        'bu_access@bicol-u.edu.ph',
  phone:        '',
  facebook:     'https://www.facebook.com/BUACCeSS2015',
  instagram:    'https://www.instagram.com/bu_access/',
  twitter:      'https://twitter.com/bu_access',
  tiktok:       'https://www.tiktok.com/@bu_access',
  discord:      'https://discord.gg/RXbrhwU5Df',
  twitch:       'https://www.twitch.tv/bu_access',
  heroBg:       'landing-page-imgs/groupphoto.JPG',
  heroHeadline: 'Academic Consortium of<br/><em class="italic text-[#F5C518]">Computer Science</em> Students',
  heroSub:      'Empowering CS students through community, sustainable development, and meaningful experiences since 2015.',
  ctaLabel:     'Join the Org',
  ctaLink:      'register.html',
  showEvents:    true,
  showNews:      true,
  showDirectory: true,
  showCounter:   true,
  showCta:       true,
};

/**
 * Fetch all documents from a collection with type safety.
 */
export async function getAll<T = any>(
  colName: string,
  opts: { orderByField?: string; orderDir?: 'asc' | 'desc' } = {}
): Promise<T[]> {
  try {
    const colRef = collection(db, colName);
    const q = opts.orderByField
      ? query(colRef, orderBy(opts.orderByField, opts.orderDir || 'asc'))
      : colRef;
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
  } catch (err) {
    console.error(`[ACCeSS] getAll(${colName}) failed:`, err);
    return [];
  }
}

/**
 * Fetch a single document by ID.
 */
export async function getOne<T = any>(colName: string, docId: string): Promise<T | null> {
  try {
    const snap = await getDoc(doc(db, colName, docId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as T) : null;
  } catch (err) {
    console.error(`[ACCeSS] getOne(${colName}/${docId}) failed:`, err);
    return null;
  }
}

/**
 * Create or overwrite a document by ID.
 */
export async function setDocument(colName: string, docId: string, data: DocumentData): Promise<boolean> {
  try {
    await setDoc(doc(db, colName, docId), data);
    return true;
  } catch (err) {
    console.error(`[ACCeSS] setDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Add a new document with an auto-generated Firestore ID.
 */
export async function addDocument(colName: string, data: DocumentData): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, colName), data);
    return ref.id;
  } catch (err) {
    console.error(`[ACCeSS] addDocument(${colName}) failed:`, err);
    return null;
  }
}

/**
 * Partially update fields on an existing document.
 */
export async function updateDocument(colName: string, docId: string, data: DocumentData): Promise<boolean> {
  try {
    await updateDoc(doc(db, colName, docId), data);
    return true;
  } catch (err) {
    console.error(`[ACCeSS] updateDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Delete a document by ID.
 */
export async function deleteDocument(colName: string, docId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, colName, docId));
    return true;
  } catch (err) {
    console.error(`[ACCeSS] deleteDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Subscribe to real-time updates on a collection.
 */
export function listenToCollection<T = any>(
  colName: string,
  callback: (items: T[]) => void,
  opts: { orderByField?: string; orderDir?: 'asc' | 'desc' } = {}
): Unsubscribe {
  try {
    const colRef = collection(db, colName);
    const q = opts.orderByField
      ? query(colRef, orderBy(opts.orderByField, opts.orderDir || 'asc'))
      : colRef;
    return onSnapshot(
      q,
      snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T)));
      },
      err => {
        console.error(`[ACCeSS] listenToCollection(${colName}) error:`, err);
      }
    );
  } catch (err) {
    console.error(`[ACCeSS] listenToCollection(${colName}) setup failed:`, err);
    return () => {};
  }
}

/**
 * Server timestamp
 */
export function timestamp() {
  return serverTimestamp();
}

/**
 * Auth Helpers
 */
export async function loginWithEmail(email: string, pass: string): Promise<{ user?: User; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return { user: cred.user };
  } catch (err: any) {
    return { error: err.code || err.message };
  }
}

export async function logoutUser(): Promise<boolean> {
  try {
    await signOut(auth);
    return true;
  } catch (err) {
    console.error("[ACCeSS] logoutUser failed:", err);
    return false;
  }
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function requireAuth(loginPath: string = 'index.html'): Promise<User> {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (!user) {
        window.location.href = loginPath;
      } else {
        resolve(user);
      }
    });
  });
}

/**
 * Activity log helper
 */
export async function logActivity(action: string, color: string = 'blue'): Promise<void> {
  try {
    const user = getCurrentUser();
    await addDoc(collection(db, COLS.ACTIVITY), {
      actor: user?.email || 'Admin',
      action,
      color,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Site settings helper
 */
export async function loadSettings(): Promise<SiteSettings> {
  const docData = await getOne<SiteSettings>(COLS.SETTINGS, 'main');
  return { ...SETTINGS_DEFAULTS, ...(docData || {}) };
}

export async function saveSettings(data: Partial<SiteSettings>): Promise<boolean> {
  return setDocument(COLS.SETTINGS, 'main', {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Authentic BU ACCeSS Fallback Datasets
 * Ensures full UI completeness if Firestore collection is initially unpopulated.
 */
export const FALLBACK_EVENTS: import('./types').EventItem[] = [
  {
    id: 'event-codefest-2025',
    title: 'ACCeSS CodeFest 2025: Hack for Bicolandia',
    desc: 'The premier annual inter-collegiate hackathon bringing together BU Computer Science student builders to engineer disaster-resilient applications and civic technology.',
    date: '2026-11-15',
    time: '08:00 AM - 08:00 PM',
    location: 'CS Building Hall 2, Bicol University',
    category: 'Hackathon',
    status: 'upcoming',
    image: 'landing-page-imgs/groupphoto.JPG',
    link: 'events.html',
  },
  {
    id: 'event-github-masterclass',
    title: 'Git & GitHub Undergrad Masterclass: Open Source 101',
    desc: 'Hands-on laboratory workshop covering version control, pull requests, automated GitHub Actions, and contributing to open-source computing repositories.',
    date: '2026-11-28',
    time: '01:30 PM - 05:00 PM',
    location: 'CS Computer Laboratory 3',
    category: 'Workshop',
    status: 'upcoming',
    link: 'events.html',
  },
  {
    id: 'event-ai-deeplearning',
    title: 'AI & Neural Systems: Foundations in PyTorch',
    desc: 'A technical immersion into neural networks, tensor operations, computer vision architectures, and practical model deployment for CS undergraduates.',
    date: '2026-12-05',
    time: '09:00 AM - 12:00 PM',
    location: 'College of Science Amphitheater',
    category: 'Tech Talk',
    status: 'upcoming',
    link: 'events.html',
  },
  {
    id: 'event-career-summit',
    title: 'CS Career Pathways: Silicon Valley & Global Remote',
    desc: 'Alumni panel featuring seasoned Bicol University CS graduates working across software engineering, cybersecurity, and cloud architecture worldwide.',
    date: '2026-10-10',
    time: '02:00 PM - 05:00 PM',
    location: 'Virtual Zoom / CS Auditorium',
    category: 'Seminar',
    status: 'past',
    link: 'events.html',
  },
];

export const FALLBACK_NEWS: import('./types').NewsItem[] = [
  {
    id: 'news-incubator-launch',
    title: 'BU ACCeSS Launches Student Innovation Incubator for AY 2024-2025',
    excerpt: 'A new semester-long project acceleration initiative providing mentorship, cloud credits, and technical architecture reviews for student teams.',
    body: 'The Academic Consortium of Computer Science Students (BU ACCeSS) is proud to announce the launch of its Student Innovation Incubator. Designed to bridge the gap between classroom theory and production engineering, this initiative provides undergraduate scholars with peer architectural reviews, access to developer tools, and faculty mentorship.',
    type: 'news',
    author: 'BU ACCeSS Editorial',
    date: '2026-10-20',
    cover: 'landing-page-imgs/groupphoto.JPG',
    status: 'published',
  },
  {
    id: 'proj-disaster-mesh',
    title: 'Project Bayan: Disaster Telemetry Network Wins Regional Hackathon',
    excerpt: 'BU Computer Science team engineers an offline-first LoRa mesh radio telemetry unit for community flood monitoring in Albay.',
    body: 'A team of BU CS student developers representing ACCeSS took top honors at the Regional Civic Tech Summit. Their project, BayanMesh, enables resilient communications and flood telemetry without cellular coverage during severe weather emergencies.',
    type: 'project',
    author: 'Project R&D Team',
    date: '2026-10-12',
    cover: 'landing-page-imgs/groupphoto.JPG',
    status: 'published',
  },
  {
    id: 'edit-cs-curriculum-future',
    title: 'The Evolving Landscape of Computer Science Education in Bicolandia',
    excerpt: 'An editorial on embracing generative AI, distributed systems, and real-world problem solving within university computing programs.',
    body: 'As the computing discipline accelerates at breakneck speed, computer science education at Bicol University continues to modernize. By emphasizing fundamentals in data structures alongside practical software engineering and open collaboration, ACCeSS champions a forward-looking student community.',
    type: 'editorial',
    author: 'Committee on Academics',
    date: '2026-09-28',
    status: 'published',
  },
];

export const FALLBACK_TERMS: import('./types').Term[] = [
  { id: 'ay-2024-2025', name: 'A.Y. 2024–2025', yearStart: 2024, yearEnd: 2025 },
  { id: 'ay-2023-2024', name: 'A.Y. 2023–2024', yearStart: 2023, yearEnd: 2024 },
];

export const FALLBACK_OFFICERS: import('./types').Officer[] = [
  { id: 'off-1', first: 'Carl', last: 'Morco', role: 'President', dept: 'Executive Committee', term: 'ay-2024-2025', order: 1, photo: 'directory-imgs/carl.JPG', email: 'carl.access@bicol-u.edu.ph', bio: 'Leading consortium operations, strategic academic partnerships, and organizational development.' },
  { id: 'off-2', first: 'Andrew', last: 'Bermas', role: 'VP for Internal Affairs', dept: 'Executive Committee', term: 'ay-2024-2025', order: 2, photo: 'directory-imgs/andrew.jpg', email: 'andrew.access@bicol-u.edu.ph', bio: 'Overseeing internal committee collaboration and student member initiatives.' },
  { id: 'off-3', first: 'Barbs', last: 'Imperial', role: 'VP for External Affairs', dept: 'Executive Committee', term: 'ay-2024-2025', order: 3, photo: 'directory-imgs/barbs.jpg', email: 'barbs.access@bicol-u.edu.ph', bio: 'Managing university relations, tech industry partnerships, and regional hackathon liaisons.' },
  { id: 'off-4', first: 'Gebhel', last: 'Bolo', role: 'Secretary General', dept: 'Executive Committee', term: 'ay-2024-2025', order: 4, photo: 'directory-imgs/gebhel.jpg', email: 'gebhel.access@bicol-u.edu.ph', bio: 'Head of organizational communications, minutes, and administrative governance.' },
  { id: 'off-5', first: 'Jho', last: 'Alvarez', role: 'Associate Secretary', dept: 'Committee on Records', term: 'ay-2024-2025', order: 5, photo: 'directory-imgs/jho.jpg', email: 'jho.access@bicol-u.edu.ph', bio: 'Maintaining consortium documentation, membership databases, and institutional archives.' },
  { id: 'off-6', first: 'Lex', last: 'Rivera', role: 'Director of Finance', dept: 'Committee on Finance', term: 'ay-2024-2025', order: 6, photo: 'directory-imgs/lex.JPG', email: 'lex.access@bicol-u.edu.ph', bio: 'Stewarding consortium funds, sponsorship allocations, and event budgets.' },
  { id: 'off-7', first: 'Maki', last: 'Santillan', role: 'Director of Audit', dept: 'Committee on Finance', term: 'ay-2024-2025', order: 7, photo: 'directory-imgs/maki.jpg', email: 'maki.access@bicol-u.edu.ph', bio: 'Ensuring transparency, fiscal accountability, and compliance across all initiatives.' },
  { id: 'off-8', first: 'Rei', last: 'Dela Cruz', role: 'Director for Academics', dept: 'Committee on Academics', term: 'ay-2024-2025', order: 8, photo: 'directory-imgs/rei.jpg', email: 'rei.access@bicol-u.edu.ph', bio: 'Organizing peer review tutorials, competitive coding seminars, and lecture series.' },
  { id: 'off-9', first: 'Vim', last: 'Belmonte', role: 'Director for R&D', dept: 'Committee on Academics', term: 'ay-2024-2025', order: 9, photo: 'directory-imgs/vim.jpg', email: 'vim.access@bicol-u.edu.ph', bio: 'Coordinating hackathons, capstone projects, and open-source software drives.' },
  { id: 'off-10', first: 'Rens', last: 'Guerrero', role: 'Director for Logistics', dept: 'Committee on Logistics', term: 'ay-2024-2025', order: 10, photo: 'directory-imgs/rens.jpg', email: 'rens.access@bicol-u.edu.ph', bio: 'Managing event venues, technical equipment, and on-ground deployment.' },
  { id: 'off-11', first: 'Shana', last: 'Bermudo', role: 'Director for Multimedia', dept: 'Committee on Multimedia', term: 'ay-2024-2025', order: 11, photo: 'directory-imgs/shana.jpg', email: 'shana.access@bicol-u.edu.ph', bio: 'Directing visual identity, branding guidelines, and digital promo assets.' },
  { id: 'off-12', first: 'Xaris', last: 'Valenzuela', role: 'Creative Director', dept: 'Committee on Multimedia', term: 'ay-2024-2025', order: 12, photo: 'directory-imgs/xaris.JPG', email: 'xaris.access@bicol-u.edu.ph', bio: 'Lead designer for consortium branding, social banners, and event graphics.' },
  { id: 'off-13', first: 'Vhon', last: 'Espinas', role: 'Public Relations Officer', dept: 'Committee on Multimedia', term: 'ay-2024-2025', order: 13, photo: 'directory-imgs/vhon.jpg', email: 'vhon.access@bicol-u.edu.ph', bio: 'Managing social media broadcasting, community announcements, and press releases.' },
  { id: 'off-14', first: 'Wen', last: 'Barrameda', role: 'Director for Student Welfare', dept: 'Executive Committee', term: 'ay-2024-2025', order: 14, photo: 'directory-imgs/wen.jpg', email: 'wen.access@bicol-u.edu.ph', bio: 'Advocating for student rights, wellbeing, and academic support programs.' },
  { id: 'off-15', first: 'Yesha', last: 'Tolentino', role: 'Lead Community Coordinator', dept: 'Executive Committee', term: 'ay-2024-2025', order: 15, photo: 'directory-imgs/yesha.jpg', email: 'yesha.access@bicol-u.edu.ph', bio: 'Facilitating student batch engagement, outreach programs, and member relations.' },
];
