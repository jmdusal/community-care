import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet, type Paginated } from './api';

export type HealthProgram = {
  id: string;
  title: string;
  category: { value: string; label: string };
  summary: string;
  description: string;
  starts_on: string;
  ends_on: string | null;
  source: { name: string; url: string | null } | null;
  facility_count?: number;
  facilities?: { id: string; name: string; city: string | null; region: string | null }[];
};

export const PROGRAM_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'screening', label: 'Screening' },
  { value: 'maternal_child', label: 'Mother & child' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'infectious_disease', label: 'Infectious disease' },
  { value: 'health_education', label: 'Health education' },
];

export function usePrograms(category: string) {
  return useQuery({
    queryKey: ['programs', category],
    queryFn: () => apiGet<Paginated<HealthProgram>>(`/health-programs?per_page=50${category ? `&category=${category}` : ''}`),
    placeholderData: keepPreviousData,
  });
}

export function useProgram(id: string) {
  return useQuery({ queryKey: ['program', id], queryFn: async () => (await apiGet<{ data: HealthProgram }>(`/health-programs/${id}`)).data });
}

/** "Nov 10 – Dec 15, 2026" or "From Nov 10, 2026". */
export function programDates(program: Pick<HealthProgram, 'starts_on' | 'ends_on'>): string {
  const fmt = (date: string) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

  return program.ends_on ? `${fmt(program.starts_on)} – ${fmt(program.ends_on)}` : `From ${fmt(program.starts_on)}`;
}

/** Icon and colours per category, so each kind of campaign is easy to spot. */
export const CATEGORY_STYLE: Record<string, { icon: 'medkit-outline' | 'search-outline' | 'heart-outline' | 'nutrition-outline' | 'shield-outline' | 'school-outline' | 'megaphone-outline'; color: string; soft: string }> = {
  immunization: { icon: 'medkit-outline', color: '#0f766e', soft: '#f0fdfa' },
  screening: { icon: 'search-outline', color: '#1d4ed8', soft: '#eff6ff' },
  maternal_child: { icon: 'heart-outline', color: '#be185d', soft: '#fdf2f8' },
  nutrition: { icon: 'nutrition-outline', color: '#b45309', soft: '#fffbeb' },
  infectious_disease: { icon: 'shield-outline', color: '#7c3aed', soft: '#f5f3ff' },
  health_education: { icon: 'school-outline', color: '#0369a1', soft: '#f0f9ff' },
};

export const DEFAULT_CATEGORY_STYLE = { icon: 'megaphone-outline' as const, color: '#0f766e', soft: '#f0fdfa' };

/** "Ends today", "Ends in 3 days", "Ongoing", "Starts Nov 20" (Philippine dates). */
export function programTiming(program: Pick<HealthProgram, 'starts_on' | 'ends_on'>, now = new Date()): string {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  if (program.starts_on > today) {
    return `Starts ${new Date(`${program.starts_on}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;
  }
  if (!program.ends_on) {
    return 'Ongoing';
  }
  const days = Math.round((new Date(`${program.ends_on}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);

  return days <= 0 ? 'Ends today' : days === 1 ? 'Ends tomorrow' : `Ends in ${days} days`;
}
