import type { CategoryId } from './category';

export interface LearnChapter {
  categoryId: CategoryId;
  title: string;
  overview: string;           // 章概要 200〜400 文字（半角/全角問わず文字数カウント）
  keyTermIds: string[];       // terms.json の id を参照（章あたり 5〜10 個）
  keyPoints: string[];        // 要点箇条書き（章あたり 5 項目以上）
  exampleQuestionIds: string[]; // questions/ の id を参照（章あたり厳密に 3 個）
  source_refs: string[];      // NotebookLM 参照文字列（章あたり 1 個以上、各要素 5 文字以上）
}
