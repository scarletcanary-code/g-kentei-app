import type { CategoryId } from './category';

export interface LearnSection {
  heading: string;              // セクション見出し（10〜60 文字）
  body: string;                 // 本文（初心者向けに噛み砕きつつ G 検定水準まで詳説。段落区切りは \n\n）
  termIds?: string[];           // このセクションに関連する用語 ID（terms.json と整合）
}

export interface LearnChapter {
  categoryId: CategoryId;
  title: string;
  overview: string;           // 章概要（初心者向けの導入。目安 300〜500 字）
  prerequisites?: CategoryId[];                           // 前提章 ID の配列
  sections: LearnSection[];                               // 必須。章あたり 5〜7 要素
  keyTermIds: string[];       // terms.json の id を参照（章あたり 5〜10 個）
  keyPoints: string[];        // 要点箇条書き（章あたり 5 項目以上）
  exampleQuestionIds: string[]; // questions/ の id を参照（章あたり厳密に 3 個）
  source_refs: string[];      // NotebookLM 参照文字列（章あたり 1 個以上、各要素 5 文字以上）
  source_ref_supplements?: string[];                      // Felo API 由来の補助参照
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  relatedChapters?: CategoryId[];                         // 関連章 ID の配列
}
