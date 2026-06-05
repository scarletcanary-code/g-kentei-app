import type { LearnChapter } from '../../types/learn';

export const learnCh2: LearnChapter = {
  categoryId: 'ch2',
  title: 'AI研究の歴史と動向',
  overview: `AIの歴史には「ブーム（盛り上がり）」と「冬の時代（停滞）」が繰り返されてきました。この章では、その流れを3つのブームに沿って整理します。

第1次ブーム（1950〜60年代）は「コンピュータが論理的に考える」という夢から始まりました。チェスや迷路のような限られた問題では成果を出しましたが、現実世界の複雑さには対処できず、「AI冬の時代」を迎えます。第2次ブーム（1980年代）は専門家の知識をルール化した「エキスパートシステム」が主役でしたが、知識を整備し続ける難しさが壁になりました。そして第3次ブーム（2010年代〜）では、大量のデータ・GPU・ディープラーニングの三拍子が揃い、画像認識や言語処理が人間レベルを超えるほど発展。2022年の ChatGPT 登場で「生成AI」が社会に広まり、現在も進化が続いています。G検定では各ブームの特徴・限界・代表的な出来事の年代をしっかり覚えることが重要です。`,
  prerequisites: [],
  difficulty: 'beginner',
  sections: [
    {
      heading: `第1次AIブーム：探索と推論の時代`,
      body: `1950〜60年代の第1次AIブームは、「コンピュータに論理的な推論をさせれば知能が生まれる」という期待から始まりました。この時代のAIは、迷路の最短ルートを探す、チェスの次の手を考えるといった「探索・推論」が得意でした。しかし条件が限られた「トイ・プロブレム（おもちゃの問題）」ではうまくいっても、現実の問題は条件が多く曖昧すぎて太刀打ちできませんでした。条件の数が少し増えるだけで、考えるべき組み合わせが爆発的に増える「組み合わせ爆発」も深刻な壁でした。

期待が実用につながらず研究資金が削減されると「AI冬の時代」が訪れます。停滞のもうひとつの原因が「フレーム問題」です。「何を考えて何を無視すればよいか」をAIが自分で判断するのが難しいという問題で、現実世界の複雑さには対処できないことを示しました。

G検定では第1次ブームの中心が「探索・推論」であること、トイ・プロブレムの限界・組み合わせ爆発・フレーム問題からAI冬へという流れが問われます。`,
      termIds: ['first_ai_boom', 'search_and_inference', 'toy_problem', 'ai_winter', 'frame_problem', 'combinatorial_explosion'],
    },
    {
      heading: `第2次AIブーム：エキスパートシステムの栄枯盛衰`,
      body: `1980年代の第2次AIブームでは「専門家の知識をルール化してコンピュータに入れれば、専門家の代わりになれる」というアイデアが脚光を浴びました。これが「エキスパートシステム」です。「もし発熱があり、かつ喉が赤いなら、風邪の疑いあり」といった形でルールを大量に書き込み、医療診断や設備保全など特定の分野で成果を上げ、企業や政府が競って導入しました。

しかし限界がすぐ見えてきます。専門家が「なんとなく分かる」という感覚（暗黙知）をルールに落とし込むことが非常に難しく、ルールの数が増えるほど矛盾が生じ、更新作業も膨大になります。これを「知識獲得ボトルネック」と呼びます。現実にはルールで表現しにくい知識のほうが多く、エキスパートシステムは実用限界を迎えて2度目のAI冬が訪れました。

G検定では第2次ブームの主役がエキスパートシステムで、挫折の原因が「知識獲得ボトルネック」であることが頻出です。知識をどう形式化するかという「知識表現」とセットで覚えましょう。`,
      termIds: ['second_ai_boom', 'expert_system', 'knowledge_acquisition_bottleneck', 'knowledge_representation'],
    },
    {
      heading: `第3次AIブーム：データ・GPU・ディープラーニングの三拍子`,
      body: `2010年代に始まった第3次AIブームは、過去と決定的に異なる点があります。「ビッグデータ」「GPU」「ディープラーニング」の三要素が同時に揃ったことです。

ビッグデータ（インターネットで生まれる大量データ）が学習の素材を提供し、GPU（もともとゲーム用の画像処理チップ）が大量の行列計算を高速に処理し、ディープラーニング（多層ニューラルネットワーク）がデータから特徴を自動で学ぶ仕組みを実現しました。過去2回のブームとの最大の違いは「人間が特徴量を手作業で設計しなくてよい」点です。データさえあれば、モデルが自分で重要なパターンを見つけ出します。

2012年の画像認識コンテスト「ILSVRC」で AlexNet が圧倒的な精度で優勝したことが世界的な転換点となり、「ディープラーニングの時代」の幕が開きました。

G検定では「三拍子」の内容と2012年のILSVRC での成功が頻出です。「なぜ第3次は続いているのか」（データと計算資源があり続けるため）も理解しておきましょう。`,
      termIds: ['third_ai_boom', 'deep_learning', 'neural_network', 'big_data', 'gpu', 'alexnet', 'image_recognition'],
    },
    {
      heading: `AlphaGoとTransformerが変えたAIの世界`,
      body: `2016年、囲碁AI「AlphaGo」がプロ棋士に勝利しました。囲碁は選択肢が天文学的に多く（約10の170乗とも言われます）、従来の探索手法では不可能とされていた領域です。AlphaGoは「強化学習（自分自身と繰り返し対戦して上達する手法）」とディープラーニングを組み合わせて、この難題を攻略しました。

2017年には「Transformer（トランスフォーマー）」というアーキテクチャが登場します。論文のタイトルは "Attention Is All You Need"（注意機構さえあればよい）。文章の中で「どの単語に注目するか」を並列に計算する「自己注意機構（Self-Attention）」を持ち、長い文脈も捉えやすく並列計算もできます。このTransformerを基盤に、BERTやGPTなどの「大規模言語モデル（LLM）」が発展しました。BERTは文脈理解・分類に強く、GPTは文章生成に強いという違いがあります。

G検定ではAlphaGoの強化学習、TransformerとLLMへの発展という流れが問われます。`,
      termIds: ['alphago', 'reinforcement_learning', 'transformer', 'llm', 'gpt', 'deep_learning', 'bert'],
    },
    {
      heading: `生成AIの登場と社会への普及`,
      body: `2022年11月の ChatGPT 公開は、AIを研究者・開発者だけのものから、一般の人々が日常的に使うツールへと変えた出来事でした。文章・画像・音楽・コードを「生成」するAIが急速に普及し、「生成AI」という言葉が社会に定着しました。その基盤にあるのが「基盤モデル（Foundation Model）」で、大量データで学習した巨大なモデルをさまざまなタスクに転用できる設計です。GPT-4 や Gemini などが代表例で、数百億〜数兆のパラメータを持ちます。

一方で課題もあります。代表的なのが「ハルシネーション（幻覚）」で、AIが事実でない情報をもっともらしく生成してしまう現象です。情報源なしに「もっともらしい答え」を作り出すため、専門的な検証なしには信じてはいけません。他にも著作権への影響、個人情報漏洩のリスク、誰が責任を持つかという説明責任、偽情報の生成といった問題が議論されています。

G検定ではハルシネーションの定義、基盤モデルの特徴（大規模・汎用・転用可能）、生成AIが引き起こす社会的課題が問われます。`,
      termIds: ['chatgpt', 'generative_ai', 'foundation_model', 'hallucination', 'accountability', 'gpt'],
    },
    {
      heading: `AIを支えるハードウェアと運用基盤（MLOps）`,
      body: `AIの性能はアルゴリズムだけでは決まりません。それを動かす「ハードウェア」と「運用の仕組み」が同じくらい重要です。

GPU（グラフィックス処理装置）はもともとゲームの映像処理用チップですが、大量の単純な計算を並列で高速処理できるため、ディープラーニングの行列演算に最適でした。同じ処理を数千のコアで同時に行えるため、CPU（中央処理装置）より何倍も速く学習できます。近年はAI専用チップのTPU（Google製）や各社製アクセラレータも登場しています。しかし計算規模の拡大はコストと電力消費の増大も意味し、環境負荷も無視できません。

AIを実際のビジネスで使い続けるには、モデルを作って終わりではなく、データの更新・性能監視・再学習・セキュリティを継続的に管理する必要があります。この運用管理の仕組みを「MLOps（機械学習の運用＝Machine Learning Operations）」と呼びます。

G検定ではGPUが行列計算に強い理由と、MLOpsの目的（継続的な開発・監視・更新）が問われます。`,
      termIds: ['gpu', 'mlops', 'deep_learning', 'machine_learning_definition'],
    },
  ],
  keyTermIds: [
    'first_ai_boom',
    'second_ai_boom',
    'third_ai_boom',
    'search_and_inference',
    'expert_system',
    'knowledge_representation',
    'deep_learning',
    'big_data',
    'gpu',
    'neural_network',
  ],
  keyPoints: [
    '第1次AIブーム（1950-60年代）は探索・推論が中心で、トイ・プロブレムには有効だったが現実の問題に対処できず終焉',
    '第2次AIブーム（1980年代）はエキスパートシステム・知識表現が中心で、知識獲得のボトルネックにより終焉',
    '第3次AIブーム（2010年代〜）はビッグデータ・GPU・ディープラーニングが三拍子揃い現在も継続中',
    '2012年のILSVRCでAlexNetが優勝し、ディープラーニングの優位性を世界に示した',
    'AlphaGo（2016年）は深層強化学習で囲碁世界チャンピオンを打ち破り、第3次ブームの象徴となった',
    '2017年のTransformerアーキテクチャ登場が現代のLLM・生成AIの基盤を形成した',
    'AI冬の時代は過大な期待の後に研究資金が削減された停滞期で、第1次・第2次ブームの後にそれぞれ発生',
    '現代のAIはデータから自動学習できるため、過去のブームと根本的に異なる持続性を持つ',
  ],
  exampleQuestionIds: ['ch2-001', 'ch2-006', 'ch2-008'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 3つのAIブーム・エキスパートシステム・探索推論・知識表現・知識獲得ボトルネック',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 ビッグデータ・GPU・ディープラーニング台頭・AlexNet・ILSVRC・AlphaGo',
  ],
  source_ref_supplements: [
    'https://arstechnica.com/ai/2024/11/how-a-stubborn-computer-scientist-accidentally-launched-the-deep-learning-boom/',
    'https://blogs.nvidia.co.jp/blog/accelerating-ai-artificial-intelligence-gpus/',
    'https://note.com/medicalconsult/n/n8c5ff6ee79a7',
    'https://zenn.dev/kmitsu76/books/975652dc36299b/viewer/207192',
    'https://podcasts.apple.com/jp/podcast/%E8%80%B3%E3%81%A7%E5%AD%A6%E3%81%B6g%E6%A4%9C%E5%AE%9A-%E7%AC%AC2%E8%A9%B1-%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD%E3%81%A8%E3%81%AF-ai%E3%81%AE%E6%AD%B4%E5%8F%B2/id1822409963?i=1000714260108',
    'https://www.tryeting.jp/column/1279/',
    'https://masassiah.xyz/archives/897',
    'https://note.com/nflag007/n/n4213366d71ac',
    'https://www.jdla.org/recommendedbook/study/',
    'https://zero2one.jp/ai-word/progression-of-ai/?srsltid=AfmBOoopeOh-P_UFgJheiQSHntuIbVMfox37AdpATRx7mGhjgBvr7R3C',
    'https://urayamaschool.com/aipass/text2.html',
    'https://www.tohoho-web.com/ai/history.html',
    'https://open.spotify.com/episode/5fy6ekZ0LrNdzmTUyRfaLl',
    'https://note.com/takumi_gpt/n/n8c2ad7f90181',
    'https://proglearn.com/ai-winter-past-and-future/',
    'https://www.atmalab.co.jp/ai-articles/ai-history3',
    'https://design-studio-f.com/blog/history-of-ai-booms-overview/',
    'https://note.com/recaljp/n/n604a285f284e',
    'https://www.soumu.go.jp/johotsusintokei/whitepaper/ja/r06/html/nd131110.html',
    'https://zero2one.jp/ai-word/progression-of-ai/?srsltid=AfmBOooQgbYSDOrs8iEW6j3j_FJxsNqUS0SvhIyJrjlaVbNpIbn3CLtA',
    'https://www.mext.go.jp/b_menu/hakusho/html/hpaa202401/1421221_00003.html',
    'https://www.geolab.jp/documents/column/ai-002/',
    'https://ja.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD%E3%81%AE%E6%AD%B4%E5%8F%B2',
    'https://aipicks.net/ai/boom-1980-1987',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://www.kotora.jp/c/119679-2/',
    'https://kimini.online/blog/archives/80659',
    'https://e-words.jp/w/%E7%AC%AC%E4%B8%80%E6%AC%A1AI%E3%83%96%E3%83%BC%E3%83%A0.html',
    'https://www.marketing.nssol.nipponsteel.com/knowledge/predictive-ai/pioneeringedge-tech01/',
    'https://ja.wikipedia.org/wiki/AI%E3%81%AE%E5%86%AC',
    'https://www.historyofdatascience.com/ai-winter-the-highs-and-lows-of-artificial-intelligence/',
    'https://e-words.jp/w/AI%E3%81%AE%E5%86%AC.html',
    'https://www.technologyreview.jp/s/17283/ai-winter-isnt-coming/',
    'https://note.com/takumi_gpt/n/n19d3236e4a5f',
    'https://ja.wikipedia.org/wiki/Transformer_(%E6%A9%9F%E6%A2%B0%E5%AD%A6%E7%BF%92%E3%83%A2%E3%83%87%E3%83%AB)',
    'https://aws.amazon.com/jp/what-is/transformers-in-artificial-intelligence/',
    'https://zenn.dev/zenkigen_tech/articles/2023-01-shimizu',
    'https://note.com/hirokatsu267/n/ndf5b2d4d4e83',
    'https://www.xlsoft.com/jp/blog/blog/2024/10/02/grammarly-20-post-79517/',
    'https://www.meta-intelligence.tech/ja/insight-transformer',
    'https://www.sbbit.jp/article/cont1/130017',
    'https://huggingface.co/learn/llm-course/ja/chapter1/4',
    'https://www.thoughtspot.com/jp/blog/what-is-transformer-architecture-chatgpt',
    'https://vinsmoke-three.com/LLM/00_illustrated_transformer/',
    'https://boochi-engineer.net/archives/4066',
    'https://x.com/G_keyword_dict/status/2044142544934842434',
    'https://note.com/kens_reading1/n/n2868738af022',
    'https://note.com/lively_swan2582/n/n4a49d8a9db31',
    'https://watlab-blog.com/2019/11/24/gexam-ai-boom/',
    'https://zero2one.jp/ai-word/increase-of-data/?srsltid=AfmBOoqY_qTyAQCqK0Ai1GcZgu2Pc5nyKNXNpFklSZMYrgfL7WxJxOY1',
    'https://qiita.com/kengo-sk8/items/148cf7c9cab32466e4f5',
    'https://note.com/domonjo01/n/n8a053969f643',
    'https://ai-kenkyujo.com/certification/g-kentei/gkentei-kakomon/',
    'https://note.com/ohara_designer/n/nd922ee5aa78f',
    'https://beginner-ai.com/general/',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://www.jdla.org/certificate/general/issues/',
    'https://note.com/firm_bonobo7417/n/n9768b5c9c5ec',
    'https://knmts.com/310/',
    'https://open.spotify.com/show/52TrTqVElvmc7mLBlJcCbR',
    'https://qiita.com/4484/items/2fddff9c223747ceac5d',
    'https://coeteco.jp/articles/13146',
    'https://tt-tsukumochi.com/archives/5889',
    'https://e-words.jp/w/%E7%AC%AC%E4%B8%89%E6%AC%A1AI%E3%83%96%E3%83%BC%E3%83%A0.html',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://freelance-concierge.jp/articles/detail/118/',
    'https://www.jdla.org/certificate/general/start/',
    'https://www.jdla.org/g-qa/',
    'https://aiacademy.jp/media/?p=6409',
    'https://quizlet.com/jp/1086724417/g%E6%A4%9C%E5%AE%9A%E7%94%A8%E8%AA%9E%E9%9B%86-flash-cards/',
    'https://note.com/dx_roadmap/n/n9c066db18e3b',
    'https://ai-shikaku.com/ai/g-kentei/gkentei-passing-line/',
    'https://note.com/kayokamoto/n/n096d8c7aaed1',
    'https://bizroad-svc.com/blog/gkentei-kakomon/',
    'https://note.shiftinc.jp/n/n404e0f52b9aa',
    'https://www.poj.usace.army.mil/Portals/33/docs/BusinessWithUs/Japanese_EM385-1-1_NOV2014.pdf?ver=2018-10-30-035005-127',
    'https://tora3data.com/gkentei/',
    'https://a-x.inc/blog/ai-seminar/',
    'https://globis.jp/learning-paths/76617246/',
    'https://www.smartnews.com/news/article/4926980271493878599-%E3%82%A8%E3%83%8C%E3%83%93%E3%83%87%E3%82%A3%E3%82%A2%E3%81%A8%E3%82%A2%E3%83%83%E3%83%97%E3%83%AB%E3%81%AE%E9%A1%9E%E4%BC%BC%E7%82%B9%E3%81%A8%E3%81%AF%EF%BC%9F%20%E7%9B%A4%E7%9F%B3%E3%81%AA%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A8%E3%82%A2%E5%9F%BA%E7%9B%A4%E3%81%8C%E5%84%AA%E3%82%8C%E3%81%9F%E3%83%8F%E3%83%BC%E3%83%89%E3%82%A6%E3%82%A8%E3%82%A2%E3%82%92%E6%94%AF%E3%81%88%E3%82%8B',
    'https://www.cio.com/article/4093454/ai%E6%99%82%E4%BB%A3%E3%82%92%E6%94%AF%E3%81%88%E3%82%8B%E3%80%8C%E8%A6%8B%E3%81%88%E3%81%AA%E3%81%84%E5%BF%83%E8%87%93%E3%80%8D%E2%80%95%E2%80%95%E3%83%87%E3%83%BC%E3%82%BF%E3%82%BB%E3%83%B3%E3%82%BF.html',
    'https://shift-ai.co.jp/blog/56127/',
    'https://globalxetfs.co.jp/research/ai-infrastructure-laying-the-groundwork/index.html',
    'https://www.geekly.co.jp/column/cat-position/ai_engineer_certification/',
    'https://note.com/domonjo01/n/nd33f2cc5df18',
    'https://uck-inc.jp/uck-blog/it_tech/7126/',
    'https://g-ken-master.com/for-gken/4839/',
    'https://www.hitachi-ite.co.jp/column/114.html',
    'https://tech-news.jp/blog/ai%E3%83%8F%E3%83%BC%E3%83%89%E3%82%A6%E3%82%A7%E3%82%A2%EF%BC%9A%E7%9F%A5%E8%83%BD%E5%8C%96%E6%99%82%E4%BB%A3%E3%82%92%E6%94%AF%E3%81%88%E3%82%8B%E5%9F%BA%E7%9B%A4%E6%8A%80%E8%A1%93/',
    'https://www.pwc.com/jp/ja/knowledge/column/dataanalytics/ai-driven-hardware01.html',
    'https://forbesjapan.com/articles/detail/79119',
    'https://biz.kddi.com/beconnected/feature/2025/250616/',
    'https://www.macnica.co.jp/business/ai/blog/145251/',
    'https://medium.com/@arghya05/the-evolution-of-transformer-architecture-from-2017-to-2024-5a967488e63b',
    'https://qiita.com/Narcolepsyy/items/786b1a5a1a0373e3e12e',
    'https://note.com/suzacque/n/nadc35985a9f1',
    'https://note.com/repkuririn7/n/ndc49c45f3406',
    'https://zenn.dev/jcat/articles/eb4ece731c1d80',
    'https://corp.omake.co.jp/ai%E5%B9%B4%E8%A1%A8%E6%B1%BA%E5%AE%9A%E7%89%88%EF%BC%81%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD70%E5%B9%B4%E3%81%AE%E6%AD%A9%E3%81%BF%E3%81%A8%E9%87%8D%E8%A6%81%E3%81%AA%E8%BB%A2%E6%8F%9B%E7%82%B9/',
    'https://aismiley.co.jp/ai_news/detailed-explanation-of-the-history-of-ai-and-artificial-intelligence/',
    'https://blogs.mathworks.com/japan-community/2025/02/17/transformer-models-from-hype-to-implementation-jp/',
    'https://note.com/ktakahiro/n/nd07aa4cf61ff',
    'https://globalxetfs.co.jp/research/chatgpts-one-year-anniversary-generative-ais-breakout-year/index.html',
    'https://zenn.dev/sakaitomoaki/articles/edbfb63b54a966',
    'https://japan.zdnet.com/article/35094103/',
    'https://taskhub.jp/useful/chatgpt-2022%E5%B9%B411%E6%9C%88/',
    'https://gigazine.net/news/20161216-2016-ai-creation/',
    'https://japan.zdnet.com/article/35075444/',
    'https://www.ibm.com/jp-ja/think/topics/history-of-artificial-intelligence',
    'https://forbesjapan.com/articles/detail/87062',
    'https://www.nedo.go.jp/activities/introduction_100028_01.html',
    'https://note.com/mshouji/n/n486affb146ad',
    'https://kreisel.krs.bz/lab/chatgpt-history',
    'https://note.com/shi3zblog/n/n1576e38cbd78',
    'https://www.pwc.com/jp/ja/knowledge/thoughtleadership/ai-society-industry-shift.html',
    'https://www.reddit.com/r/ChatGPT/comments/17u1h6d/chat_gpt_told_me_its_last_knowledge_update_was/?tl=ja',
    'https://help.openai.com/ja-jp/articles/6825453-chatgpt-%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%83%8E%E3%83%BC%E3%83%88',
    'https://ja.wikipedia.org/wiki/ChatGPT',
    'https://jp.linkedin.com/pulse/chatgpt-latest-chatbot-invention-2022-lorna-munanie?tl=ja',
  ],
  relatedChapters: ['ch1', 'ch3'],
};
