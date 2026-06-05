import type { LearnChapter } from '../../types/learn';

export const learnCh6: LearnChapter = {
  categoryId: 'ch6',
  title: 'ディープラーニングの応用',
  overview: `この章では、ディープラーニングが実際の製品・サービスにどう応用されているかを学びます。

大きく3つのテーマがあります。①大規模言語モデル（LLM）の代表格である GPT と BERT の違い、②画像や音楽を「生成」する深層生成モデル（GAN・VAE・拡散モデル）、③LLM を実務で使いこなすための技術（RAG・LoRA・スケーリング則）です。「どんな仕組みでどんなことができるのか」「それぞれの限界は何か」という視点で整理すると、G検定の選択問題に対応しやすくなります。専門用語が多いですが、「2種類のモデル比較（GPT vs BERT）」「3種類の生成モデル比較（GAN・VAE・拡散モデル）」という形で表を作るように整理するのがおすすめです。またこの章は最先端のトレンドに直結しており、G検定での出題が年々増加傾向にある分野でもあります。ch5 のアーキテクチャ基礎（特に Transformer の Self-Attention）を踏まえた上で学ぶと、各モデルの仕組みがより深く理解できます。`,
  prerequisites: ['ch5'],
  difficulty: 'advanced',
  sections: [
    {
      heading: `GPT と BERT：LLM の2大アーキテクチャ`,
      body: `大規模言語モデル（LLM）の代表格が GPT と BERT です。どちらも ch5 で学んだ Transformer を基盤にしていますが、構造と得意なことが大きく異なります。

GPT はデコーダ型 Transformer で、「次のトークン（単語や文字）を予測する」自己回帰的な学習を繰り返すことで自然な文章生成が得意です。ChatGPT はこの GPT を人間のフィードバック（RLHF＝Reinforcement Learning from Human Feedback、人間が好む回答を強化学習で学ぶ方法）で調整したものです。会話・要約・翻訳・コード生成など幅広く使えますが、事実でない情報をもっともらしく生成する「ハルシネーション」が課題です。GPT-3 は1750億パラメータ、GPT-4 はさらに大規模とされており、大きくなるほど能力が上がるスケーリング則に従っています。

BERT はエンコーダ型 Transformer で、文章の穴埋め（マスク言語モデル）と隣接文章の予測という2つの事前学習により文脈を深く理解します。文の意味を双方向に把握することが得意で、検索・文書分類・固有表現抽出・質問応答などに使われます。文章を「ゼロから生成する」能力は弱く、GPT とは役割が違います。

覚え方：GPT＝Generate（生成）、BERT＝Bidirectional（双方向）。GPT は左から右に読んで次を予測するのに対し、BERT は文全体を双方向に見て意味を把握します。

G検定ではどちらの構造がエンコーダ型か、得意な用途（生成 vs 理解・分類）の違い、RLHF の概要が問われます。混同しやすいので表で整理しておきましょう。`,
      termIds: ['llm', 'gpt', 'bert', 'transformer', 'hallucination', 'masked_language_model', 'scaling_law', 'chatgpt', 'rlhf', 'decoder', 'reinforcement_learning'],
    },
    {
      heading: `GAN・VAE・拡散モデル：3つの画像生成アーキテクチャ`,
      body: `AIが絵や画像を「生成」する技術には、仕組みが異なる3つの代表的なモデルがあります。3つとも「訓練データを学習して、新しい現実らしいデータを作る」点は共通ですが、どう生成するかが違います。

GAN（敵対的生成ネットワーク、2014年提案）は「ジェネレータ（生成器）」と「ディスクリミネータ（識別器）」が競い合う構造です。偽物の画像を作るジェネレータと、本物か偽物かを見抜くディスクリミネータが互いを鍛え合い、本物そっくりの画像が生まれます。顔画像・アニメ絵・写実的な風景の生成で高い品質が出ます。一方、学習が不安定で同じような画像ばかり生成する「モード崩壊」や、「訓練データを丸暗記した結果の出力」も課題です。

VAE（変分オートエンコーダ）は入力データの特徴を「潜在空間」という圧縮された確率的な表現（平均と分散）に変換し、そこからデータを再構成します。連続的な潜在空間を持つため、「犬の画像と猫の画像の中間」のような補間・変換ができます。ただし生成画像がぼやけやすい傾向があります。

拡散モデル（Diffusion Model）は画像に少しずつガウスノイズを加えて最終的にランダムノイズにする「順方向過程（拡散過程）」と、逆にノイズから元の画像を少しずつ復元する「逆方向過程（逆拡散過程）」を学習します。Stable Diffusion・DALL-E・Midjourney が代表例。現在最も高品質な生成ができますが、1枚生成するのに多くの計算ステップ（サンプリングステップ）が必要でGANより生成が遅い傾向があります。

G検定では3つの違いを比較する問題が出ます。「敵対的学習＝GAN」「潜在空間の確率的サンプリング＝VAE」「段階的ノイズ除去プロセス＝拡散モデル」のキーワードで整理しましょう。`,
      termIds: ['gan', 'vae', 'diffusion_model', 'generative_model', 'stable_diffusion', 'autoencoder'],
    },
    {
      heading: `RAG：LLM に「最新の知識」を与える仕組み`,
      body: `LLM は学習データに含まれる知識だけを持っており、学習後の新しい情報は知りません。また知識に誤りがあると「もっともらしい嘘」（ハルシネーション）をついてしまいます。これを補うのが RAG（Retrieval-Augmented Generation＝検索拡張生成）です。

RAG の仕組みは「聞く前に辞書を調べる」ことに近いです。ユーザーが質問すると、まず外部の知識ベース（データベースや文書集）から関連する情報を検索します。その情報を質問とともに LLM に渡し、根拠のある回答を生成させます。これにより社内文書や最新ニュースなど、モデルが学習していない情報にも対応できます。

RAG の主な利点：
- ハルシネーションの抑制（根拠となる文書がある）
- 情報源の提示（どのドキュメントから回答したか示せる）
- 知識の更新が容易（モデルを再学習しなくてよい）
- 企業内の機密文書に安全にアクセスできる

G検定では「RAG は LLM の外部に検索システムを組み合わせてハルシネーションを抑える手法」という定義と、目的・利点が問われます。`,
      termIds: ['rag', 'llm', 'hallucination'],
    },
    {
      heading: `LoRA とスケーリング則：効率的な活用技術`,
      body: `LLM はパラメータ数が膨大なため、特定のタスクに合わせてファインチューニングするのも大変です。そこで使われるのが LoRA（Low-Rank Adaptation＝低ランク適応）です。

LoRA は元のモデルのパラメータを固定したまま、「少数の追加パラメータ」だけを学習します。数学的には「大きな行列の変化を、小さな2つの行列（低ランク行列）の積で近似する」という発想です。たとえば10億パラメータのモデルでも、LoRA では数百万パラメータの小さな追加部分だけを学習します。必要なメモリと計算量が大幅に減り、個人や中小規模の組織でも LLM のカスタマイズが現実的になりました。現在多くのオープンソース LLM のカスタマイズに使われています。

スケーリング則（Scaling Laws）は「モデルのパラメータ数・学習データ量・計算量を増やすほど、予測可能な割合で性能が上がる」という経験則です。OpenAI が2020年に発見・発表し、「とにかく大きくすれば良くなる」というモデルの大型化を推進する理論的根拠となりました。ただし大きくするほどコスト・電力消費・環境負荷も増えるため、性能向上と持続可能性のバランスが課題です。

G検定では LoRA の仕組み（元モデルは固定・低ランク追加パラメータのみ学習）とスケーリング則の定義が問われます。`,
      termIds: ['lora', 'scaling_law', 'llm', 'fine_tuning'],
    },
  ],
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
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 LLM・GPT・BERT・Transformer応用・生成AI・GAN・VAE・拡散モデル・VAE再パラメータ化トリック・seq2seq',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 RAG・LoRA・RLHF・スケーリング則・マルチモーダル・GPT-4V・CLIP',
  ],
  source_ref_supplements: [
    'https://note.com/vast_cosmos500/n/n37d6c17388ca',
    'https://note.com/sanpitaron/n/n2b94a147c8d1',
    'https://ai4mdx.com/g/study_flow.html',
    'https://www.simulationroom999.com/blog/jdla-deep-learning-for-general-2020-1/',
    'https://anujxagarwal.medium.com/llm-models-basics-and-bert-vs-gpt-two-titans-of-natural-language-processing-aa5dfa4c5717',
    'https://a-x.inc/blog/llm-architecture/',
    'https://jp.linkedin.com/pulse/top-architectural-patterns-behind-large-language-models-srikanth-r-ewljc?tl=ja',
    'https://qiita.com/555hamano/items/b74b845efd8b190a2696',
    'https://renue.co.jp/posts/transformer-toha',
    'https://zenn.dev/su8/articles/343a3c4a1bb62c',
    'https://cysec148.hatenablog.com/entry/2025/04/02/064903',
    'https://note.com/coroeri/n/nb11ae00fe54b',
    'https://zenn.dev/tasse/articles/b1d0a1ff122c41',
    'https://fintan.jp/page/9126/',
    'https://www.dir.co.jp/world/entry/solution/llm',
    'https://www.brainpad.co.jp/doors/contents/01_tech_2023-05-31-160318/',
    'https://aiacademy.jp/media/?p=6409',
    'https://zenn.dev/retrieva_tech/articles/d30fd6300ad2f6',
    'https://ankilot.com/view/?id=SB3nF6hGwl',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://shift-ai.co.jp/blog/56127/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://plaza.rakuten.co.jp/takumitools/diary/201902160000/',
    'https://note.com/nappo_ai/n/n4f501205a2dc',
    'https://zenn.dev/tasse/articles/eac2056b0662ff',
    'https://qiita.com/skillup_ai/items/b922b4f29dd189e43899',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://ai-shikaku.com/ai/g-kentei/gkentei-passing-line/',
    'https://ankimaker.com/workbooks/29918eed-3cf0-4a7f-9f85-9f263977e1b2',
    'https://zero2one.jp/ai-word-category/deeply-generative-model/?srsltid=AfmBOoq2SwilecczfZmEn9PL8l9zncIphmG1ziQXaNjWy-FUT2CU-vrn',
    'https://dcon.ai/study/',
    'https://www.agaroot.jp/datascience/column/gtest-text/',
    'https://choko-yoku.com/1522/',
    'https://bizroad-svc.com/blog/gkentei-taisaku/',
    'https://qiita.com/hitottiez/items/18299e6af25c93b9f6c0',
    'https://www.youngju.dev/blog/ai/2026-03-17-generative-ai-gan-vae-diffusion-guide.ja',
    'https://www.seplus.jp/dokushuzemi/blog/2020/06/entry_ai_with_dl4g.html',
    'https://aismiley.co.jp/ai_news/what-is-the-diffusion-model/',
    'https://note.com/eurekachan/n/n7c47b1e37fb2',
    'https://www.meta-intelligence.tech/ja/insight-diffusion-models',
    'https://www.geekly.co.jp/column/cat-position/ai_engineer_certification/',
    'https://www.persol-group.co.jp/service/business/article/20628/',
    'https://note.com/narumi_ai/n/ndef2bfc7e546',
    'https://service.shiftinc.jp/column/14929/',
    'https://reskilling.com/article/68/',
    'https://note.com/709s/n/n7a3595ef5866',
    'https://uepon.hatenadiary.com/entry/2026/01/06/013045',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://renue.co.jp/posts/llm-fine-tuning-rag-comparison-domain-adaptation-enterprise-guide',
    'https://g-ken-master.com/',
    'https://zenn.dev/akari1106/articles/e0a611f9fac69a',
    'https://manabinoba.blog/llm-pretraining-finetuning/',
    'https://note.com/vast_cosmos500/n/n46800613a1b4',
    'https://note.com/note_tech/n/na852cb75f01e',
    'https://qiita.com/sergicalsix/items/84e4a2552e2245435540',
    'https://books.jitsumu.co.jp/',
    'https://qiita.com/Ringa_hyj/items/88691e738bb36bc3dabf',
    'https://jp.linkedin.com/pulse/scaling-ai-infrastructure-llms-best-practices-mid-sized-companies-vm4fe?tl=ja',
    'https://daily-life-ai.com/2756/',
    'https://qiita.com/mrmrmr/items/fc6affd25a16420b5325',
    'https://qiita.com/mrmrmr/items/cab33bbf300c42bf4862',
    'https://note.com/hotate_nt/n/n323f4b0df55e',
    'https://shion.blog/the-10th-machine-learning-workshop_2/',
    'https://nisshingeppo.com/ai/book-gkentei/',
    'https://deepsquare.jp/2023/01/encoder-decoder/',
    'https://gri.jp/media/entry/390',
    'https://g-ken-master.com/glossary/5107/',
    'https://www.simulationroom999.com/blog/g-test-preparation-make-the-ultimate-cheat-papers-4/',
    'https://zenn.dev/welcomecat/articles/c149ff8bbe47c4',
    'https://note.com/gfiddich12years/n/n13ac787b6aff',
    'https://nzw.jp/2025/tech/g-exam.html',
    'https://craftai.jp/ow-to-choose-g-kentei-study-materials/',
  ],
  relatedChapters: ['ch5', 'ch7'],
};
