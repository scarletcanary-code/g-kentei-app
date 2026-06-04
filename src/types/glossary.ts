import type { CategoryId } from './category';

export type Importance = 1 | 2 | 3;

export interface GlossaryTerm {
  id: string;
  term: string;
  termEn: string;
  categoryId: CategoryId;
  definition: string;
  detail: string;                        // 解説本文
  relatedTermIds: string[];
  importance: Importance;
  source_ref_supplements?: string[];     // Felo 由来 URL 保存用 — 今回追加
  aliases?: string[];                    // 検索・alias 用の別称リスト（任意）
}
