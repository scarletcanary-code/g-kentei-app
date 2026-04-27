import type { CategoryId } from './category';

export type Importance = 1 | 2 | 3;

export interface GlossaryTerm {
  id: string;
  term: string;
  termEn: string;
  categoryId: CategoryId;
  definition: string;
  detail: string;                        // 上級 — 既存、変更しない
  beginnerDetail?: string;               // 初級 — 既存、変更しない
  intermediateDetail?: string;           // 中級 — 今回追加
  relatedTermIds: string[];
  importance: Importance;
  source_ref_supplements?: string[];     // Felo 由来 URL 保存用 — 今回追加
}
