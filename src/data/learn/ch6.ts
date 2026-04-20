import type { LearnChapter } from '../../types/learn';

export const learnCh6: LearnChapter = {
  categoryId: 'ch6',
  title: 'ディープラーニングの応用',
  overview:
    'ディープラーニングの応用技術として、自然言語処理分野では大規模言語モデル（LLM）が中心的な存在となっている。GPTはTransformerのデコーダをベースにした自己回帰型の生成モデルで、ChatGPTはRLHF（人間フィードバックによる強化学習）で指示追従性を付与したものである。BERTはエンコーダベースで双方向文脈理解に優れ、文書分類・質問応答に活用される。生成AIの分野ではGAN（生成的敵対ネットワーク）・VAE（変分オートエンコーダ）・拡散モデルが代表的な深層生成モデルである。最新の画像生成AI（Stable Diffusion等）は拡散モデルを採用している。実用上の技術として、LLMのハルシネーション抑制と最新情報対応のRAG（検索拡張生成）、少ないパラメータ更新でファインチューニングを実現するLoRA、各パラメータ規模・データ量・計算量と性能の関係を示すスケーリング則が重要である。また画像・音声・テキストを統合処理するマルチモーダルAIも急速に発展している。',
  keyTermIds: [
    'llm',
    'gpt',
    'bert',
    'diffusion_model',
    'gan',
    'rag',
    'lora',
    'rlhf',
    'scaling_law',
    'multimodal',
  ],
  keyPoints: [
    'GPTはTransformerデコーダベースの自己回帰型生成モデルで、ChatGPTはRLHFで人間の意図に合わせて調整',
    'BERTはTransformerエンコーダベースで双方向文脈理解に優れ、テキスト分類・質問応答向き',
    'GANは生成器と識別器が競い合う敵対的学習で高品質な画像を生成するが、学習不安定になりやすい',
    '拡散モデルはノイズ付加・除去プロセスを学習し、GANより安定して高品質な画像生成が可能',
    'RAGはLLMの回答生成時に外部知識ベースから関連文書を検索・参照することでハルシネーションを抑制',
    'LoRAは低ランク行列を追加するだけで少ないパラメータでファインチューニングを実現する効率的手法',
    'スケーリング則によりパラメータ数・データ量・計算量が増えるほど予測可能に性能が向上する',
    'マルチモーダルAIはテキスト・画像・音声など複数種類のデータを統合して処理するAI',
  ],
  exampleQuestionIds: ['ch6-001', 'ch6-005', 'ch6-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 LLM・GPT・BERT・Transformer応用・生成AI・GAN・拡散モデル',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 RAG・LoRA・RLHF・スケーリング則・マルチモーダル',
  ],
};
