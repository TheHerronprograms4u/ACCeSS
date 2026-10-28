/**
 * TypeScript Data Models for BU ACCeSS
 */

export interface EventItem {
  id: string;
  title: string;
  desc?: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  status?: 'upcoming' | 'ongoing' | 'past' | 'draft' | string;
  image?: string;
  link?: string;
  createdAt?: any;
  _s?: 'upcoming' | 'ongoing' | 'past';
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  type: 'news' | 'project' | 'editorial' | string;
  author?: string;
  date?: string;
  cover?: string;
  link?: string;
  tags?: string;
  status: 'published' | 'draft' | string;
  createdAt?: any;
}

export interface Officer {
  id: string;
  first: string;
  last: string;
  role: string;
  dept?: string; // Standing Committee
  term: string;  // Term ID
  order?: number | string;
  photo?: string;
  bio?: string;
  email?: string;
  fb?: string;
}

export interface Term {
  id: string;
  name: string;
  yearStart?: number;
  yearEnd?: number;
}

export interface SiteSettings {
  logoUrl?: string;
  siteName?: string;
  siteTagline?: string;
  colorPrimary?: string;
  colorAccent?: string;
  colorText?: string;
  foundedYear?: string;
  college?: string;
  about?: string;
  mission?: string;
  vision?: string;
  address?: string;
  email?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  discord?: string;
  twitch?: string;
  heroBg?: string;
  heroHeadline?: string;
  heroSub?: string;
  ctaLabel?: string;
  ctaLink?: string;
  showEvents?: boolean;
  showNews?: boolean;
  showDirectory?: boolean;
  showCounter?: boolean;
  showCta?: boolean;
  [key: string]: any;
}

export interface ActivityLogItem {
  id: string;
  actor: string;
  action: string;
  color?: string;
  createdAt?: any;
}

export interface MembershipApplication {
  id?: string;
  fullName: string;
  studentId: string;
  email: string;
  phone?: string;
  yearLevel: string;
  program: string;
  committees: string[];
  motivation: string;
  status: 'pending' | 'approved' | 'reviewed';
  createdAt?: any;
}
