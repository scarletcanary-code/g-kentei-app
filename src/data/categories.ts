import type { Category, CategoryId } from '../types/category';

export const CATEGORIES: Category[] = [
  {
    id: 'ch1',
    name: '人工知能（AI）とは',
    shortName: 'AIとは',
    chapterNum: 1,
    questionCount: 10,
    glossaryCount: 15,
  },
  {
    id: 'ch2',
    name: '人工知能をめぐる動向',
    shortName: 'AI動向',
    chapterNum: 2,
    questionCount: 8,
    glossaryCount: 12,
  },
  {
    id: 'ch3',
    name: '機械学習の具体的手法',
    shortName: '機械学習',
    chapterNum: 3,
    questionCount: 15,
    glossaryCount: 20,
  },
  {
    id: 'ch4',
    name: 'ディープラーニングの概要',
    shortName: 'DL概要',
    chapterNum: 4,
    questionCount: 12,
    glossaryCount: 15,
  },
  {
    id: 'ch5',
    name: 'ディープラーニングの要素技術',
    shortName: 'DL要素技術',
    chapterNum: 5,
    questionCount: 15,
    glossaryCount: 25,
  },
  {
    id: 'ch6',
    name: 'ディープラーニングの応用例',
    shortName: 'DL応用',
    chapterNum: 6,
    questionCount: 10,
    glossaryCount: 15,
  },
  {
    id: 'ch7',
    name: 'AIの社会実装に向けて',
    shortName: '社会実装',
    chapterNum: 7,
    questionCount: 10,
    glossaryCount: 12,
  },
  {
    id: 'ch8',
    name: 'AIの法律と倫理',
    shortName: '法律・倫理',
    chapterNum: 8,
    questionCount: 10,
    glossaryCount: 15,
  },
];

export function getCategoryById(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
