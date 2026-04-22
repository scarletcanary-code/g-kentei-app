import type { CategoryId } from './category';

export type Importance = 1 | 2 | 3;

export interface GlossaryTerm {
  id: string;
  term: string;
  termEn: string;
  categoryId: CategoryId;
  definition: string;
  detail: string;
  beginnerDetail?: string;
  relatedTermIds: string[];
  importance: Importance;
}
