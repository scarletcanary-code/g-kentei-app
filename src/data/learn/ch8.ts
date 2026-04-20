import type { LearnChapter } from '../../types/learn';

export const learnCh8: LearnChapter = {
  categoryId: 'ch8',
  title: 'AI・法律・倫理',
  overview:
    'AIの普及に伴い、法律・倫理・ガバナンスの整備が世界的に急務となっている。日本では個人情報保護法がAI活用時の個人データ取り扱いの法的枠組みを提供し、仮名加工情報・匿名加工情報などの区分が定められている。著作権法30条の4（2018年改正）はAI学習目的での著作物の無許諾利用を認める世界的に先進的な規定である。EU AI法（2024年施行）は世界初の包括的AI規制法でリスクに応じた4段階分類を採用し、許容できないリスクのAI（社会的スコアリング等）を禁止する。国際的な枠組みとして、2023年のG7広島サミットで立ち上がった「広島AIプロセス」が主要国間のAIガバナンス調整を担っている。AI倫理の観点からは、公平性（Fairness）・透明性（Transparency）・説明責任（Accountability）の3原則が重要であり、ディープフェイクなどの悪用問題への対処も求められる。個人のプライバシー保護と、GDPRに代表されるデータ保護規制への対応も不可欠な課題である。',
  keyTermIds: [
    'personal_information_protection_act',
    'copyright_act_30_4',
    'eu_ai_act',
    'hiroshima_ai_process',
    'fairness',
    'transparency',
    'accountability',
    'privacy',
    'ai_ethics',
    'ai_governance',
  ],
  keyPoints: [
    '個人情報保護法は個人情報・仮名加工情報・匿名加工情報などの区分を定め、AI活用時の法的枠組みを提供する',
    '著作権法30条の4はAI学習目的での著作物の無許諾利用を認める日本独自の先進的規定（2018年改正）',
    'EU AI法はリスクベースアプローチで4段階分類し、禁止AIや高リスクAIに厳格な義務を課す世界初の包括的AI規制',
    '広島AIプロセスはG7サミット（2023年）で立ち上がり、国際的なAIガバナンス原則の策定・調整を担う',
    'AI倫理の3原則：公平性（Fairness）・透明性（Transparency）・説明責任（Accountability）',
    'ディープフェイクはAIによる偽動画・偽音声の生成技術で、情報操作・詐欺などの悪用が社会問題となっている',
    'GDPRはEUの一般データ保護規則で、個人データ保護の国際基準として日本企業も対応が必要',
    'プライバシーと利便性のトレードオフ・AIバイアスによる差別リスクは継続的なガバナンスが必要な課題',
  ],
  exampleQuestionIds: ['ch8-001', 'ch8-005', 'ch8-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 個人情報保護法・著作権法30条の4・EU AI法・広島AIプロセス・AI倫理',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:8a1f7483-8869-4721-a3cd-6e2c73ec3152 AI倫理原則・公平性・透明性・説明責任・ディープフェイク・GDPR・プライバシー',
  ],
};
