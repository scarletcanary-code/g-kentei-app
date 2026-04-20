import type { LearnChapter } from '../../types/learn';

export const learnCh1: LearnChapter = {
  categoryId: 'ch1',
  title: '人工知能（AI）とは',
  overview:
    '人工知能（AI）とは、人間の知的活動（推論・学習・判断など）をコンピュータ上で再現・模倣しようとする技術の総称であり、専門家の間でも統一された定義は存在しない。AIは能力の違いによって「特化型AI（ナローAI）」と「汎用型AI（AGI）」に分類され、現在の実用技術はすべて特化型AIに該当する。また哲学的な観点から、真の意識・心を持つ「強いAI」と、特定の知的作業を模倣するだけの「弱いAI」という区分もある。AIの知能判定には、アラン・チューリングが提唱したチューリングテストが古典的な基準として知られる。AIが現実世界で機能できない根本的な課題として「フレーム問題」と「シンボルグラウンディング問題」が挙げられる。さらに、一度AIで実現した技術が「単なる自動化」とみなされてしまうAI効果という現象も、AI定義の境界を曖昧にし続ける要因となっている。',
  keyTermIds: [
    'artificial_intelligence',
    'narrow_ai',
    'artificial_general_intelligence',
    'strong_ai',
    'weak_ai',
    'turing_test',
    'frame_problem',
    'symbol_grounding_problem',
    'singularity',
    'ai_level_classification',
  ],
  keyPoints: [
    'AIに統一された定義はなく、専門家により様々な観点で定義されている',
    '現在の実用AIはすべて特定タスクに特化した「特化型AI（ナローAI）」であり、汎用型AI（AGI）は未実現',
    '強いAI（意識・心を持つ）と弱いAI（特定タスクを模倣するだけ）の哲学的区分がある',
    'チューリングテストは機械の知能を対話で判定する古典的な方法だが、現代では不十分とも指摘される',
    'フレーム問題は現実世界の無限の考慮事項に対処できないというAIの根本的限界を示す',
    'シンボルグラウンディング問題は記号（言葉）と現実の実体が結びついていないという問題',
    'AIレベル分類（1〜4）で、ディープラーニングはレベル4として特徴量もAI自身が自律学習する',
    'AI効果により、実現された技術は「AIではなく単なる自動化」とみなされる傾向がある',
  ],
  exampleQuestionIds: ['ch1-001', 'ch1-004', 'ch1-007'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 AIの定義・特化型AI・強弱AI・チューリングテスト・フレーム問題',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 AIレベル分類・シンボルグラウンディング問題',
  ],
};
