import type { CategoryId } from './category';

export interface Choice { text: string; }

export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  categoryId: CategoryId;
  question: string;
  choices: Choice[];
  correctIndex: number;
  explanation: string;
  relatedTermIds: string[];
  difficulty: Difficulty;
  tags: string[];
  source_ref?: string;
  source_ref_supplements?: string[];
}
