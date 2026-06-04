import type { LearnChapter } from '../../types/learn';

export const learnCh1: LearnChapter = {
  categoryId: 'ch1',
  title: '人工知能（AI）とは',
  overview: `この章では、AI（人工知能）とは何かという、いちばん根っこの部分を学びます。

意外に思うかもしれませんが、専門家の間でもAIに「唯一の正しい定義」はありません。そこでまず、AIという言葉がどう使われ、なぜ定義が揺れるのか（AI効果）から出発します。次に、いま実用化されているAIがすべて「特定の仕事だけが得意な特化型AI」であり、人間のように何でもこなす「汎用型AI」はまだ実現していないことを押さえます。

さらに、意識を持つかどうかで分ける「強いAI・弱いAI」、賢さの段階を示す「AIのレベル分類」、知能を測る「チューリングテスト」へと進み、後半ではAIがいまだ苦手とする「フレーム問題」「シンボルグラウンディング問題」、そして未来として語られる「シンギュラリティ」も取り上げます。専門用語はひとつずつ身近な例とともに説明します。まずは「AIとは何を目指す技術なのか」をつかむことが目標です。`,
  prerequisites: [],
  difficulty: 'beginner',
  sections: [
    {
      heading: `AIに「唯一の定義」はない`,
      body: `AI（人工知能）という言葉は毎日のように耳にしますが、実は専門家の間でも「これがAIだ」という唯一の定義は存在しません。研究者によって「人間のように考える機械」「合理的に行動するシステム」など、捉え方がさまざまに分かれています。まずは「AIにはきっちりした共通の定義がない」こと自体を知っておくことが大切です。

なぜ定義が揺れるのでしょうか。理由のひとつが「AI効果」と呼ばれる現象です。AI効果とは、ある技術が実用化されて仕組みが分かると、人々が「これは単なる自動処理であって、AIではない」と感じてしまうことを指します。かつてはAIの代表とされた文字認識や将棋プログラムも、身近になると「ただのプログラム」と見なされがちです。こうして「AIと呼ばれる範囲」は時代とともに少しずつ後退していきます。

G検定では、「AIの定義は研究者によって異なり統一されていない」「AI効果によってAIと見なされる範囲は変化する」という2点が繰り返し問われます。`,
      termIds: ['artificial_intelligence', 'ai_effect', 'intelligence'],
    },
    {
      heading: `特化型AI（ナローAI）と汎用型AI（AGI）`,
      body: `いま私たちが使っているAIは、ほぼすべて「ひとつの仕事に特化したAI」です。これを特化型AI（ナローAI）と呼びます。翻訳、画像認識、囲碁など、決められた特定の課題だけをこなすタイプで、その分野では人間を上回ることもあります。しかし、別の課題には流用できません。囲碁で世界最強のAIに、翻訳をさせることはできないのです。

これに対して、人間のように分野をまたいで考え、初めて出会う問題にも柔軟に対応できるAIを汎用型AI（AGI＝Artificial General Intelligence）と呼びます。アニメに出てくる「ドラえもん」のような、何でもこなすAIがこれにあたります。ただし、汎用型AIはまだ実現しておらず、研究段階にあります。

G検定では「現在実用化されているAIはすべて特化型AIである」「人間のような汎用型AI（AGI）はまだ実現していない」という点が頻出です。特化型と汎用型の説明を入れ替えた選択肢が誤りとして出されることが多いので、どちらがどちらかを正確に覚えましょう。`,
      termIds: ['narrow_ai', 'artificial_general_intelligence'],
    },
    {
      heading: `強いAI・弱いAIと「中国語の部屋」`,
      body: `「特化型／汎用型」とは別の角度から、AIを「強いAI」と「弱いAI」に分ける考え方があります。これはアメリカの哲学者ジョン・サールが示した区分です。強いAIとは、人間のように意識や心を持ち、本当に「理解」しているAIのこと。弱いAIとは、心は持たないけれど、知的に見える作業を道具としてこなすAIのことです。

サールは「中国語の部屋」という有名な思考実験でこの違いを説明しました。中国語をまったく分からない人が部屋に閉じこもり、マニュアルに従って中国語の質問に正しく中国語で返事をするとします。外から見ると中国語を理解しているように見えますが、本人は意味をまったく分かっていません。つまり「正しく振る舞えること」と「意味を理解していること」は別だ、という主張です。これは「機械も同じで、うまく答えられても理解しているとは限らない」という、強いAIへの批判になっています。

G検定では、強いAI＝意識や心を持つ、弱いAI＝道具としての知的処理、という対応と、中国語の部屋が「強いAIへの批判」である点が問われます。特化型／汎用型の軸と混同しないよう注意してください。`,
      termIds: ['strong_ai', 'weak_ai', 'chinese_room'],
    },
    {
      heading: `AIの4つのレベル分類`,
      body: `AIと一口に言っても、その「賢さ」にはいくつかの段階があります。よく使われるのが、家電などへの搭載例で説明される4段階のレベル分類です。

レベル1は「単純な制御プログラム」。あらかじめ決めた通りに動くもので、温度で動作が変わるエアコンなどが例です（マーケティング上「AI搭載」と呼ばれることがあります）。レベル2は「古典的なAI」。入力に応じて複雑なふるまいをするもので、多数のルールを持つ将棋プログラムや、障害物を避ける掃除ロボットなどがあたります。レベル3は「機械学習を取り入れたAI」。大量のデータから、判断のためのルールやパターンをAI自身が学びます。レベル4は「ディープラーニング（深層学習）を取り入れたAI」。ここでは、学習で注目すべきポイントである「特徴量」までAI自身が見つけ出します。

レベルが上がるほど、人間が手で設計する部分が減り、AIの自律性が高まります。G検定では、特にレベル4で「特徴量を自ら学習する」点が、ディープラーニングの本質として問われます。`,
      termIds: ['ai_level_classification', 'deep_learning'],
    },
    {
      heading: `機械の知能を測る「チューリングテスト」`,
      body: `「機械は考えることができるか？」――この問いに対し、イギリスの数学者アラン・チューリングは、賢さを直接定義するのではなく「判定する方法」を提案しました。それがチューリングテストです。

このテストでは、判定者が、姿の見えない相手とキーボードを通じて会話します。相手が人間なのか機械なのか分からないまま会話を続け、判定者が機械を人間だと思い込んでしまえば、その機械には知能があると見なす、という考え方です。ポイントは、機械の中で何が起きているかではなく、外から見たふるまいが人間らしいかどうかで判断する点にあります。2014年には「ユージーン・グーツマン」という会話プログラムが初めて合格したとされ、話題になりました。

ただし、次の節で見る「中国語の部屋」のように、テストに合格しても本当に理解しているとは限らない、という批判もあります。G検定では、チューリングテストが「対話によってふるまいベースで知能を判定する」方法であること、そして中国語の部屋による批判とセットで問われます。`,
      termIds: ['turing_test', 'intelligence', 'chinese_room'],
    },
    {
      heading: `AI最大の難問：フレーム問題と記号接地問題`,
      body: `AIには、今も完全には解けていない有名な「難問」があります。その代表が、フレーム問題とシンボルグラウンディング問題（記号接地問題）です。

フレーム問題とは、「いま考えるべきこと」と「無視してよいこと」をうまく区別できない、という問題です。現実の世界では、何かを行うときに起こりうることが無数にあります。それをすべて検討しようとすると、AIは計算が終わらず動けなくなってしまいます。人間は「関係なさそうなこと」を自然に切り捨てていますが、これをAIにやらせるのは驚くほど難しいのです。

シンボルグラウンディング問題とは、AIが扱う「記号（言葉）」を、現実の意味と結びつけられない問題です。「リンゴ」という文字を処理できても、赤さや香り、手ざわりといった実際の感覚と結びついていなければ、本当に意味を分かっているとは言えません。これに関連して、知能には身体を通じた経験が必要だとする「身体性」の議論もあります。

G検定では、フレーム問題＝「考慮すべき範囲を絞り込めない」、記号接地問題＝「記号と実世界の意味が結びつかない」と整理し、両者を取り違えないことが重要です。`,
      termIds: ['frame_problem', 'symbol_grounding_problem', 'embodiment'],
    },
    {
      heading: `シンギュラリティ（技術的特異点）とは`,
      body: `AIが発展した先には何が起こるのか。よく話題になるのが「シンギュラリティ（技術的特異点）」です。

シンギュラリティとは、AIが人間の知能を超え、AI自身がさらに賢いAIを作り出せるようになることで、技術の進歩が爆発的に加速し、その先が予測できなくなる転換点のことを指します。発明家のレイ・カーツワイルは、これが2045年に訪れると予測したことで知られています。

ただし、シンギュラリティが本当に起こるのか、いつ起こるのかについては、専門家の間でも意見が分かれています。AI研究者の中には、AIを安全に制御する方法を今のうちから考えておくべきだと指摘する人もいます。大切なのは、過度に怖がることでも楽観しすぎることでもなく、AIの進歩が社会に与える影響を冷静に考える姿勢です。

G検定では、シンギュラリティが「AIが人間の知能を超える転換点」であること、カーツワイルが2045年と予測したことが問われます。また、シンギュラリティ（未来の転換点）と汎用型AI（何でもこなすAI）は別の概念なので、混同しないようにしましょう。`,
      termIds: ['singularity', 'ai_effect'],
    },
  ],
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
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 AIレベル分類・シンボルグラウンディング問題・シンギュラリティ',
  ],
  source_ref_supplements: [
    'https://www.jdla.org/certificate/general/',
    'https://ai-kenkyujo.com/term/frame-problem/',
    'https://zero2one.jp/ai-word/symbol-grounding-problem/',
    'https://ledge.ai/articles/singularity',
    'https://statisticsschool.com/%E3%80%90%E4%BD%93%E9%A8%93%E8%AB%87%E3%80%91g%E6%A4%9C%E5%AE%9A%E3%81%AF%E5%A4%A7%E5%AD%A6%E7%94%9F%E3%81%A7%E3%82%82%E5%8F%97%E3%81%8B%E3%82%8B%EF%BC%9F%E5%90%88%E6%A0%BC%E7%8E%87%E3%80%81%E9%9B%A3/',
    'https://techtarget.itmedia.co.jp/tt/news/2512/18/news05.html',
    'https://www.jdla.org/certificate/general/start/',
    'https://www.tokurotech.com/entry/G%E6%A4%9C%E5%AE%9A_%E5%90%88%E6%A0%BC%E5%A0%B1%E5%91%8A',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://note.com/laat/n/n35fa15c2169b',
    'https://www.simulationroom999.com/blog/gtest-syllabus-study-time-self-transformer/',
    'https://note.com/domonjo01/n/n8a053969f643',
    'https://ai-compass.weeybrid.co.jp/using/unlocking-the-future-with-the-g-exam/',
    'https://www.paltek.co.jp/design/odm/odmstuff/column/column01/index.html',
    'https://nuco.co.jp/blog/article/dBErgtG2',
    'https://note.com/anenglishteacher/n/n5e9380f217f5',
    'https://www.jdla.org/certificate/general/issues/',
    'https://avilen.co.jp/personal/course/g-certificate/',
    'https://www.nttpc.co.jp/gpu/article/knowledge06.html',
    'https://qiita.com/mrmrmr/items/1e770da692e866d0e550',
    'https://www.skillupai.com/ai-generalist/',
    'https://renue.co.jp/posts/generative-ai-certification-g-exam-comparison-guide-2026',
    'https://minarai-engi.com/gkentei-merits/',
    'https://aiacademy.jp/media/?p=6409',
    'https://growth-ai.jp/',
    'https://nttdocomo-developers.jp/entry/2026/02/10/090000',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://zenn.dev/tasse/articles/b021f647cd8dc7',
    'https://masassiah.xyz/archives/897',
    'https://open.spotify.com/episode/5uTr1E6Hp46HjpINPS0UBe',
    'https://ai-shikaku.com/ai/g-kentei/gkentei-benkyouhouhou/',
    'https://qiita.com/takanattie/items/78c3a4e85dd2fa790984',
    'https://www.agaroot.jp/datascience/column/aipass-gtest-difference/',
    'https://www.codexa.net/jdla-generalist-test/',
    'https://open.spotify.com/episode/68VMvKEaugGMgdmYFpZKjX',
    'https://note.com/narumi_ai/n/n1100a79e3e1b',
    'https://qiita.com/syuki-read/items/dba0b61c0443011bab5c',
    'https://zero2one.jp/ai-word/turing-test/?srsltid=AfmBOorl5RFOzo7f_G2H2Wf4yB2pOHcosYxv377I_sSNrmQ9CJOpB8Q-',
    'https://tt-tsukumochi.com/gkentei_251',
    'https://globis.jp/learning-paths/76617246/',
    'https://qiita.com/4484/items/490b10e69598ee671651',
    'https://quizlet.com/1169076033',
    'https://masassiah.xyz/archives/915',
    'https://www.insource.co.jp/bup/bup_g-test-preparation.html',
    'https://aismiley.co.jp/ai_news/what-is-the-turing-test/',
    'https://note.com/hotate_nt/n/n0432efc108fb',
    'https://saycon.co.jp/archives/neta/g-certification-textbook-part-1',
    'https://note.com/gexam_master/n/n19ccd471bec1',
    'https://note.com/ohara_designer/n/n6e9c689cc39c',
    'https://xtrend.nikkei.com/atcl/seminar/19/00005/041800001/',
    'https://note.com/kens_reading1/n/neb59530e3ec5',
    'https://note.com/coroeri/n/n7e894772facd',
    'https://qiita.com/SHIRYU_0515/items/26b47fd18ae967c26366',
    'https://saycon.co.jp/archives/neta/%E4%BB%8A%E3%81%AA%E3%81%8A%E8%A7%A3%E6%B1%BA%E3%81%8C%E9%9B%A3%E3%81%97%E3%81%84ai%E3%81%AE4%E3%81%A4%E3%81%AE%E5%95%8F%E9%A1%8C%E3%81%A8%E3%81%AF%EF%BC%9F',
    'https://zero2one.jp/ai-word/symbol-grounding-problem/?srsltid=AfmBOooRXedwue-PvudstmujIlAOkL26HslBHpdyWZ_jQod6-4XSkly1',
    'https://note.com/racketkiller/n/nc99e130bee5f',
    'https://gmor-sys.com/2022/09/22/unsolved-problems-in-ai/',
    'https://www.ios-net.co.jp/blog/20250521-4890/',
    'https://e-words.jp/w/%E3%82%B7%E3%83%B3%E3%83%9C%E3%83%AB%E3%82%B0%E3%83%A9%E3%82%A6%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E5%95%8F%E9%A1%8C.html',
    'https://atmarkit.itmedia.co.jp/ait/articles/2506/30/news020.html',
    'https://daily-life-ai.com/1265/',
    'https://ledge.ai/articles/symbol_grounding_problem',
    'https://note.com/mind_org_ops/n/n94f1e02277d8',
    'https://tora3data.com/gkentei/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://ai-skill-note.com/2026/04/06/g-kentei-guide/',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://www.jdla.org/topic/g-interview3/',
    'https://toukei-lab.com/g_exam',
    'https://zenn.dev/tasse/articles/19c75f2e6e9ebf',
    'https://zero2one.jp/ai-word/what-is-artificial-intelligence/?srsltid=AfmBOopNj40hUEX8zHCkopufG6eAsKtGIejE1DjjV1shG_IxQRiLzL37',
    'https://ankimaker.com/workbooks/ad53c5ec-3a8e-445b-968a-48f4a03488b2',
    'https://xtech.nikkei.com/it/atcl/watcher/14/334361/112800432/',
    'https://bijutsutecho.com/magazine/news/exhibition/20768?fbclid=IwAR2ni9o7r80amQ6-OjoRVVaZattjpSCWqQi8qHBOTMN0x--u34PqfvirVmo',
    'https://narow613.hatenadiary.jp/entry/2023/03/29/210506',
    'https://otafuku-lab.co/aizine/singularity-0307/',
    'https://shikaku-expert.com/g-test/books/',
    'https://note.com/ima00100/n/n0d03a48c7bf4',
    'https://note.com/triton1964/n/n1a392b2ffe4f',
    'https://ainow.ai/2018/01/11/131115/',
    'https://info.picaca.jp/24050',
    'https://nomad-journal.jp/archives/4371',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-comparison/',
    'https://www.sentinelone.com/ja/cybersecurity-101/data-and-ai/generative-ai-cybersecurity/',
    'https://www.reddit.com/r/singularity/comments/13esfpb/help_me_understand_the_pessimism_for_ai/?tl=ja',
    'https://freelance-concierge.jp/articles/detail/118/',
    'https://www.jdla.org/g-qa/',
    'https://note.com/kayokamoto/n/n096d8c7aaed1',
    'https://ai-shikaku.com/ai/g-kentei/gkentei-passing-line/',
    'https://tatsu-zine.com/books/pub/impress?srsltid=AfmBOoqwijkmRi9VwVxdHExUMfpeg3zLGT4cGoWZsZPXL1AkGgwpuPr9',
    'https://bizroad-svc.com/blog/gkentei-kakomon/',
    'https://note.shiftinc.jp/n/n404e0f52b9aa',
    'https://www.poj.usace.army.mil/Portals/33/docs/BusinessWithUs/Japanese_EM385-1-1_NOV2014.pdf?ver=2018-10-30-035005-127',
    'https://quizlet.com/jp/1086724417/g%E6%A4%9C%E5%AE%9A%E7%94%A8%E8%AA%9E%E9%9B%86-flash-cards/',
    'https://note.com/dx_roadmap/n/n9c066db18e3b',
    'https://zero2one.jp/ai-word/symbol-grounding-problem/?srsltid=AfmBOookP-7g9nr0Mej9MLM4JKFVanIkRt1piWeaTrvdfvWIsws_1Nvy',
    'https://dx-consultant-fast-evolving.com/%E3%80%90%E5%85%B7%E4%BD%93%E4%BE%8B%E3%82%82%E3%81%94%E7%B4%B9%E4%BB%8B%E3%80%91%E3%82%B7%E3%83%B3%E3%83%9C%E3%83%AB%E3%82%B0%E3%83%A9%E3%82%A6%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E5%95%8F/',
    'https://qiita.com/SHIRYU_0515/items/5f5da487dfe916125abe',
    'https://note.com/narumi_ai/n/n655ae882833b',
    'https://zero2one.jp/ai-word/singularity/?srsltid=AfmBOopQCsStGWrKnv_mjOt5O8YRUHNnsykiQFEjeK_WPY5hIdssrlOh',
    'https://saycon.co.jp/whatwedo-2/ai/g/deep-learning-for-general/deep-learning-for-general1',
    'https://www.seplus.jp/dokushuzemi/blog/2020/06/entry_ai_with_dl4g.html',
    'https://quizlet.com/jp/1070973505/g%E6%A4%9C%E5%AE%9Achapter1-flash-cards/',
    'https://note.com/lovely_laelia397/n/n92a77f68870b',
    'https://qiita.com/kengo-sk8/items/148cf7c9cab32466e4f5',
    'https://aismiley.co.jp/ai_news/generative-ai-certification/',
    'https://qiita.com/ea-yasuda/items/9831f11c189de43cb0be',
    'https://www.wp.ainiigata.com/?p=907',
    'https://zero2one.jp/ai-word/ai-effect/?srsltid=AfmBOooZ7KvHAWT77tfWINoW2-N08ClMiJc3TEYizeLv8lTnmAYzb786',
    'https://e-words.jp/p/e-dg-list.html',
  ],
  relatedChapters: ['ch2'],
};
