import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiList, apiRequest } from './api';

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
  facilities?: Array<{ id: string; name: string; city: string | null; region: string | null }>;
  /** Admin views only. */
  status?: 'draft' | 'published' | 'archived';
  updated_at?: string;
};

export const PROGRAM_CATEGORIES = [
  { value: 'immunization', label: 'Immunization' },
  { value: 'screening', label: 'Screening' },
  { value: 'maternal_child', label: 'Maternal & child health' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'infectious_disease', label: 'Infectious disease' },
  { value: 'health_education', label: 'Health education' },
  { value: 'other', label: 'Other' },
];

export function usePublicPrograms(category?: string) {
  const query = new URLSearchParams({ per_page: '50' });
  if (category) {
    query.set('category', category);
  }

  return useQuery({ queryKey: ['public-programs', category], queryFn: () => apiList<HealthProgram>(`/health-programs?${query}`), placeholderData: keepPreviousData });
}

export function usePublicProgram(id: string) {
  return useQuery({ queryKey: ['public-program', id], queryFn: () => apiRequest<HealthProgram>(`/health-programs/${id}`) });
}

/** "Nov 10 – Dec 15, 2026" or "From Nov 10, 2026". */
export function programDates(program: Pick<HealthProgram, 'starts_on' | 'ends_on'>): string {
  const fmt = (date: string) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

  return program.ends_on ? `${fmt(program.starts_on)} – ${fmt(program.ends_on)}` : `From ${fmt(program.starts_on)}`;
}
