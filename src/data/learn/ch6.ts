import type { LearnChapter } from '../../types/learn';

export const learnCh6: LearnChapter = {
  categoryId: 'ch6',
  title: 'ディープラーニングの応用',
  overview:
    'ディープラーニングの応用技術として、自然言語処理分野では大規模言語モデル（LLM）が中心的な存在となっている。GPTはTransformerのデコーダをベースにした自己回帰型の生成モデルで、ChatGPTはRLHF（人間フィードバックによる強化学習）で指示追従性を付与したものである。BERTはエンコーダベースで双方向文脈理解に優れ、文書分類・質問応答に活用される。生成AIの分野ではGAN（生成的敵対ネットワーク）・VAE（変分オートエンコーダ）・拡散モデルが代表的な深層生成モデルである。最新の画像生成AI（Stable Diffusion等）は拡散モデルを採用している。実用上の技術として、LLMのハルシネーション抑制と最新情報対応のRAG（検索拡張生成）、少ないパラメータ更新でファインチューニングを実現するLoRA、各パラメータ規模・データ量・計算量と性能の関係を示すスケーリング則が重要である。また画像・音声・テキストを統合処理するマルチモーダルAIも急速に発展している。',
  prerequisites: ['ch5'],
  difficulty: 'advanced',
  sections: [
    {
      heading: 'GPTとBERT：LLMの2大アーキテクチャを比較する',
      body: '現代の大規模言語モデル（LLM）はほぼTransformerをベースとしていますが、その使い方で2つの系統に分かれます。GPTはTransformerの「デコーダ」部分を積み上げた「自己回帰型」モデルです。前のトークンを元に次のトークンを予測するプロセスを繰り返して文章を生成します。ChatGPTはGPTにRLHF（人間フィードバックによる強化学習）を適用し、人間の指示に素直に従う「指示追従性」を付与したものです。一方BERTはTransformerの「エンコーダ」をベースにした「双方向」モデルで、文の全体的な文脈を考慮して各単語の意味を理解します。文書分類・感情分析・質問応答などの「理解タスク」に強みがあります。GPTは「生成」、BERTは「理解」と役割の違いを押さえておきましょう。',
      beginnerBody: '現代の大規模言語モデル（LLM）は、主に「トランスフォーマー」という技術を基にしていますが、主に二つのタイプに分かれます。一つはGPT（ジーピーティー）で、これは文章を作ることに特化したモデルです。GPTは、前の言葉を参考にして次の言葉を予測し、文章を順番に生成します。もう一つはBERT（バート）で、こちらは文章の意味を理解することに強いモデルです。BERTは、文章全体を見ながら各単語の意味を考えます。つまり、GPTは「文章を作る」ことに優れ、BERTは「文章を理解する」ことに優れています。このように、二つのモデルはそれぞれ異なる役割を持っています。',
      intermediateBody: `現代の大規模言語モデル（LLM）は、主に「トランスフォーマー」というアーキテクチャを基にしており、特にGPT（Generative Pre-trained Transformer）とBERT（Bidirectional Encoder Representations from Transformers）の二つの系統が存在します。GPTはトランスフォーマーのデコーダ部分を利用した自己回帰型モデルで、前のトークンを基に次のトークンを予測し、文章を生成します。このプロセスにより、自然な流れのあるテキストを作成することが可能です。特にChatGPTは、GPTに人間のフィードバックを取り入れた強化学習（RLHF）を適用し、ユーザーの指示に従う能力を強化しています。

一方、BERTはトランスフォーマーのエンコーダ部分を使用した双方向モデルであり、文全体の文脈を考慮して各単語の意味を理解します。BERTは特に文書分類、感情分析、質問応答などの理解タスクに強みを持ち、文脈を深く把握することで高精度な結果を出すことができます。

このように、GPTは「生成」に特化し、BERTは「理解」に特化したモデルであり、それぞれ異なる役割を果たしています。GPTは流暢な文章生成を得意とし、BERTは文脈理解を通じて情報を抽出する能力に優れています。これらの特性を理解することで、適切なタスクに応じたモデル選択が可能となります。`,
      termIds: ['llm', 'gpt', 'bert', 'rlhf'],
    },
    {
      heading: '深層生成モデル：GAN・VAE・拡散モデルの仕組みと違い',
      body: '画像生成などで使われる深層生成モデルには主に3つのアプローチがあります。GAN（生成的敵対ネットワーク）は「生成器」と「識別器」を競わせる敵対的学習で高品質な画像を生成しますが、学習が不安定になりやすい欠点があります。VAE（変分オートエンコーダ）は入力を潜在空間の確率分布に圧縮し、サンプリングして再構成する確率的な生成モデルです。VAEの学習では「再パラメータ化トリック（reparameterization trick）」が重要です。潜在変数をz = μ + σ×εと表現し（εは標準正規分布のサンプル）、サンプリング操作を微分可能な変換として扱うことで誤差逆伝播を可能にします。拡散モデルは画像にノイズを徐々に加えるプロセスを学習し、逆向きにノイズを除去して画像を生成します。学習が安定していてGANより多様な画像を生成でき、Stable Diffusionなどはこのアーキテクチャをベースとしています。',
      beginnerBody: '深層生成モデルには主に3つの方法があります。まず、GAN（生成的敵対ネットワーク）は、画像を作る「生成器」と、その画像が本物かどうかを判断する「識別器」が互いに競い合う仕組みです。この方法は高品質な画像を作れますが、学習が不安定になることがあります。次に、VAE（変分オートエンコーダ）は、入力データを簡単な形に圧縮し、そこから新しいデータを作り出します。この過程では、特別な技術を使って計算をスムーズに行います。最後に、拡散モデルは、画像に少しずつノイズを加え、その後逆にノイズを取り除くことで画像を生成します。この方法は安定していて、さまざまな画像を作ることができるため、Stable Diffusionなどの技術に使われています。',
      intermediateBody: `深層生成モデルは、主にGAN（生成的敵対ネットワーク）、VAE（変分オートエンコーダ）、拡散モデルの3つのアプローチに分類されます。

まず、GANは「生成器」と「識別器」の2つのネットワークが競い合う構造を持ちます。生成器は本物のデータに似たデータを生成し、識別器はそのデータが本物か偽物かを判断します。この競争により、高品質な画像が生成されますが、学習が不安定になることが多く、モード崩壊（多様性の欠如）という問題が発生することがあります。

次に、VAEは入力データを潜在空間に圧縮し、その確率分布からサンプリングを行って再構成します。VAEの特徴的な技術として「再パラメータ化トリック」があり、これにより潜在変数のサンプリングを微分可能な形で扱うことができます。これにより、誤差逆伝播が可能となり、効率的な学習が実現されます。

最後に、拡散モデルは、画像に徐々にノイズを加える「拡散過程」と、逆にノイズを取り除く「逆拡散過程」を学習します。このモデルは学習が安定しており、GANよりも多様な画像を生成できるため、最近の画像生成AI（例：Stable Diffusion）で広く採用されています。拡散モデルは、特に高品質な画像生成において優れた性能を発揮し、生成AIの新たなスタンダードとなっています。`,
      termIds: ['gan', 'vae', 'diffusion_model'],
    },
    {
      heading: 'RAG・LoRA・スケーリング則：LLM活用の実践技術',
      body: 'LLMの実用化には3つの重要な技術があります。RAG（検索拡張生成）はLLMが回答を生成する際に外部の知識ベースから関連文書を検索・参照する仕組みで、「ハルシネーション（もっともらしい嘘）」を抑制できます。LoRAはLLMの一部パラメータにのみ低ランク行列を追加してファインチューニングする効率的な手法です。スケーリング則はパラメータ数・訓練データ量・計算量が増えるほど予測可能にモデル性能が向上するという経験則です。さらに近年はマルチモーダルAIが急速に発展しています。OpenAIのGPT-4Vは画像とテキストを統合して理解・生成でき、CLIPはテキストと画像を同じベクトル空間にマッピングして関連性を学習します。テキスト・画像・音声・動画を横断して処理するマルチモーダルモデルは、医療診断・教育・コンテンツ生成など幅広い領域での応用が進んでいます。',
      beginnerBody: 'LLM（大規模言語モデル）を実用化するためには、3つの重要な技術があります。まず、RAG（検索拡張生成）は、LLMが答えを作るときに外部の情報源から関連する文書を探して使う仕組みで、これにより「ハルシネーション」と呼ばれる誤った情報を減らすことができます。次に、LoRAは、LLMの一部の設定を調整して効率よく学習させる方法です。最後に、スケーリング則は、モデルの設定や学習に使うデータが増えると、性能が向上するという経験則です。最近では、画像や音声なども扱えるマルチモーダルAIが進化しており、医療や教育など多くの分野での活用が期待されています。',
      intermediateBody: `G検定合格に向けた中級解説として、LLM（大規模言語モデル）の実用化における重要な技術について説明します。まず、RAG（検索拡張生成）は、LLMが生成する回答の精度を向上させるために、外部の知識ベースから関連文書を検索し参照する仕組みです。この技術により、LLMが誤った情報を生成する「ハルシネーション」を抑制することが可能になります。

次に、LoRA（Low-Rank Adaptation）は、LLMのファインチューニングを効率的に行う手法です。具体的には、モデルの全パラメータを更新するのではなく、低ランク行列を用いて一部のパラメータのみを調整することで、計算リソースを節約しつつ性能を向上させます。このアプローチは、特にデータが限られている場合に有効です。

最後に、スケーリング則は、モデルのパラメータ数や訓練データ量、計算量が増加することで、モデルの性能が予測可能に向上するという経験則です。この原則に基づき、研究者や開発者はモデルの設計や訓練において、リソースの最適化を図ります。

加えて、最近の進展としてマルチモーダルAIが挙げられます。これは、テキスト、画像、音声など異なるデータ形式を統合的に処理する能力を持ち、医療診断や教育、コンテンツ生成など多様な分野での応用が進んでいます。特に、OpenAIのGPT-4Vは、画像とテキストを同時に理解し生成する能力を持ち、マルチモーダルAIの実用化を加速させています。これらの技術は、今後のAIの発展において重要な役割を果たすでしょう。`,
      termIds: ['rag', 'lora', 'scaling_law', 'multimodal'],
    },
    {
      heading: 'Encoder-Decoderとseq2seq：Transformerの原型',
      body: 'Transformerが登場する前、自然言語処理の主役だったのが「seq2seq（Sequence-to-Sequence）」モデルです。seq2seqはRNNベースの「エンコーダ」と「デコーダ」を組み合わせた構造で、機械翻訳・文章要約・音声認識などに広く使われました。エンコーダは入力系列全体を固定長の「文脈ベクトル」に圧縮し、デコーダはそれを受け取って出力系列を一単語ずつ生成します。しかし固定長のボトルネックがあるため、長い入力文では情報が失われる問題がありました。この問題を解決するために考案されたのが「Attention機構」で、デコーダが各出力を生成する際にエンコーダの全ステップのうちどこに注目すべきかを動的に計算します。このEncoderが入力を理解しDecoderが出力を生成するという分業構造はTransformerに継承され、GPT（Decoderのみ）やBERT（Encoderのみ）の設計に発展し、現代LLMの基盤となっています。',
      beginnerBody: 'Transformerが登場する前、自然言語処理で主に使われていたのが「seq2seq（シーケンス・ツー・シーケンス）」モデルです。このモデルは、情報を入力する「エンコーダ」と、出力を生成する「デコーダ」という二つの部分から成り立っています。エンコーダは、入力された文章を短い形にまとめて「文脈ベクトル」と呼ばれるものに変換します。デコーダはその文脈ベクトルを使って、出力を一単語ずつ作り出します。しかし、長い文章を扱うときに情報が失われることがありました。この問題を解決するために「Attention（アテンション）」という仕組みが考えられ、デコーダがどの部分に注目すべきかを計算することで、より正確な出力が可能になりました。このようなエンコーダとデコーダの役割分担は、後のTransformerやその派生モデルであるGPTやBERTに引き継がれています。',
      intermediateBody: `Transformerが登場する以前、自然言語処理の分野で主に使用されていたのが「seq2seq（シーケンス・ツー・シーケンス）」モデルです。このモデルは、入力系列を処理する「エンコーダ」と、出力系列を生成する「デコーダ」という二つの部分から構成されています。エンコーダは、入力された文を固定長の「文脈ベクトル」に圧縮し、デコーダはこの文脈ベクトルを基にして出力を一単語ずつ生成します。

しかし、seq2seqモデルには固定長のボトルネックが存在し、特に長い入力文の場合、情報が失われるという問題がありました。この課題を克服するために導入されたのが「Attention機構」です。Attentionは、デコーダが出力を生成する際に、エンコーダの全ステップの中からどの部分に注目すべきかを動的に計算します。これにより、長文でも重要な情報を保持しながら出力を生成することが可能になりました。

このエンコーダとデコーダの役割分担は、後のTransformerアーキテクチャに引き継がれています。Transformerは、エンコーダとデコーダの両方を持ち、Attention機構を駆使して並列処理を実現することで、従来のRNNベースのモデルに比べて大幅に効率を向上させました。GPTはデコーダのみを使用し、BERTはエンコーダのみを使用する設計となっており、これらは現代の大規模言語モデル（LLM）の基盤を形成しています。`,
      termIds: ['attention_mechanism', 'bert', 'gpt', 'llm'],
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
