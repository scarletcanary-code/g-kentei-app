export type CategoryId = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ch6' | 'ch7' | 'ch8';

export interface Category {
  id: CategoryId;
  name: string;        // 日本語正式名称
  shortName: string;   // 短縮表示用（例: "AIとは"）
  chapterNum: number;  // 1〜8
  questionCount: number; // 初期計画値（MASTERPLAN の表に従う）
  glossaryCount: number; // 初期計画値
}
