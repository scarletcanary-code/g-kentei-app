import type { LearnChapter } from '../../types/learn';

export const learnCh7: LearnChapter = {
  categoryId: 'ch7',
  title: 'AIの社会実装',
  overview: `AIをビジネスの現場で実際に動かすには、「良いモデルを作る」だけでは不十分です。課題を正しく定め、データを整え、モデルを評価し、本番環境に展開し、壊れないよう監視し続ける——このサイクル全体を管理することが「AI の社会実装」です。

この章では、AIプロジェクトがどんな流れで進むかを示す「ライフサイクル」から始まります。次に「データリーケージ（評価が嘘になる落とし穴）」と「モデルドリフト（本番でじわじわ性能が落ちる問題）」、そしてAIシステムを継続運用するための仕組み「MLOps」を学びます。さらに、データのバイアスや「なぜその予測をしたのか」を説明できるようにする説明可能 AI（XAI）まで、現場目線の重要概念を整理します。技術だけでなく「組織」「法律」「倫理」との関係も問われるのがこの章の特徴です。G検定では技術的な正確さだけでなく、ビジネス文脈での課題解決の視点が問われます。社会実装のリアルな落とし穴を理解することが、合格への近道です。`,
  prerequisites: ['ch3'],
  difficulty: 'intermediate',
  sections: [
    {
      heading: `AIプロジェクトのライフサイクル：企画から運用まで`,
      body: `AIプロジェクトは「良いモデルを作れば終わり」ではなく、以下のサイクルで動きます。

1. 課題定義：「何を予測・判断させたいのか」「成功の定義は何か」を明確にする
2. データ収集・前処理：質と量を確認し、欠損・偏りを整理する
3. PoC（概念実証）：小規模な試作でビジネス価値と技術的な実現可能性を確認する
4. モデル開発・評価：適切なアルゴリズムを選び、精度指標で評価する
5. 本番デプロイ：システムに組み込み、実際のデータで動かす
6. 監視・再学習：性能が落ちていないか監視し、必要に応じてモデルを更新する

特に「PoC 止まり」は多くの企業が直面する問題です。PoC は仮説検証であり、本番導入には業務プロセスへの統合・セキュリティ・運用体制の設計が別途必要です。最初から「本番で使い続けること」を前提に計画することが重要です。

G検定ではライフサイクルの各ステップの役割と、PoC の目的（仮説検証）が問われます。`,
      termIds: ['poc', 'accountability', 'preprocessing'],
    },
    {
      heading: `特徴量エンジニアリングとデータ前処理`,
      body: `機械学習モデルの性能は、アルゴリズムと同じくらい「データの質」と「特徴量の作り方」に左右されます。

特徴量エンジニアリングとは、生のデータからモデルが学習しやすい「特徴量（入力変数）」を作る作業です。例えば、日付から「曜日」や「月末かどうか」を作ったり、テキストから単語の出現頻度を数えたりします。「ゴミを入れればゴミが出る（Garbage In, Garbage Out）」という言葉が示すように、特徴量の質がモデルの性能を大きく決めます。ディープラーニングは特徴量を自動で学べますが、表形式データや業務データでは手作業による特徴量設計が今も重要です。

データ前処理では以下の操作を行います：
- 欠損値処理：値が抜けているデータを平均値や中央値で補完するか削除する
- 外れ値処理：極端に大きい・小さい値を除去またはクリッピングする
- 標準化：平均0・標準偏差1に揃える（スケールが異なる特徴量を同等に扱うため）
- 正規化：0〜1の範囲にスケール変換する
- カテゴリ変数の数値化：「東京」→0、「大阪」→1 などに変換する

前処理は学習時と推論（本番）時で必ず同じ方法を使う必要があります。

G検定では標準化・正規化の違い、欠損値処理、前処理の一貫性が問われます。`,
      termIds: ['feature_engineering', 'preprocessing', 'missing_value', 'normalization', 'standardization'],
    },
    {
      heading: `データリーケージとモデルドリフト：本番での失敗`,
      body: `AI の評価結果と本番性能が大きくずれる主な原因が「データリーケージ」と「モデルドリフト」です。どちらも現場でよく起きる失敗パターンです。

データリーケージ（情報漏洩）とは、学習・評価データに「本番では使えない未来の情報や正解に直結する情報」が混入してしまうことです。例として：「売上を予測するモデル」に、売上確定後にしか分からない「受注確定フラグ」を特徴量として使ってしまう場合。評価ではほぼ100%の精度が出ますが、本番ではその変数が存在しないため全く使えません。時系列データでは「未来のデータを使って過去を学習する」というリーケージが起きやすく、分割方法（ランダム分割ではなく時系列分割を使う）に注意が必要です。

モデルドリフトとは、学習時と本番時でデータの傾向が変わり、時間とともに精度が下がる現象です。コロナ禍で消費行動が急変したとき、コロナ前のデータで学習したモデルは予測が大きく外れました。定期的な再学習と性能監視が対策です。「コンセプトドリフト」は目的変数そのものの意味・関係性が変わった場合を指します。

G検定ではデータリーケージの原因（未来情報・正解漏れ）と、モデルドリフトの定義・対策が問われます。`,
      termIds: ['data_leakage', 'model_drift', 'concept_drift'],
    },
    {
      heading: `MLOps：AIシステムを動かし続けるための仕組み`,
      body: `機械学習モデルは「作って終わり」ではなく、継続的に管理・改善する必要があります。この一連の仕組みを MLOps（Machine Learning Operations）と呼びます。ソフトウェア開発の DevOps をAIに適応したものです。

MLOps が管理する主な要素：
- コード・データ・モデルのバージョン管理（「いつ・何を使ってどのモデルを作ったか」を記録）
- 自動テストとデプロイ（CI/CD：コードを変更したら自動でテストして本番に反映）
- 本番モデルの監視（精度の変化・データ分布の異常・遅延などを常時チェック）
- 再学習のトリガーと自動化（性能が落ちたら自動で再学習する仕組み）

MLOps がない場合の典型的な問題：「誰かが独自に学習させたモデルがいつの間にか本番に入っている」「半年前のモデルがなぜその予測をしたか誰も追えない」「性能が落ちていたが気付かずに運用していた」などが起きます。

「誰が、いつ、どのモデルを、どの根拠で更新したか」を記録することはAIガバナンスの観点でも重要です。

G検定では MLOps の目的（継続的な開発・監視・更新）と再現性・バージョン管理の重要性が問われます。`,
      termIds: ['mlops', 'accountability', 'ai_governance'],
    },
    {
      heading: `機械学習バイアスと説明可能 AI（XAI）`,
      body: `AIが「差別的な判断をする」問題が社会的に注目されています。採用選考のAIが特定の性別・民族を不当に低評価する、ローン審査AIが特定の地域を不当に拒否するといった事例が実際に起きています。これを「機械学習バイアス」と呼びます。

バイアスの原因はデータにあります。歴史的に差別があった社会のデータで学習すると、AIはその差別パターンを学んでしまいます。「データは客観的」という思い込みが危険です。対策には、データの偏りを検査する、複数の公平性指標で評価する、多様なチームでシステムを設計するなどがあります。

また「なぜこの判断をしたのか」をAIが説明できないことも課題です（ブラックボックス問題）。ディープラーニングは性能は高いですが、内部で何が起きているか人間には見えません。これを解決するのが XAI（説明可能AI）です。代表的な手法：
- SHAP（シャップ）：ゲーム理論に基づき、各特徴量が予測にどれだけ貢献したかを数値で示す。「この人がローン審査で落ちたのは、年収の低さが50点分マイナスだったから」という形で説明できます。
- LIME（ライム）：注目するデータ点の周辺だけを単純なモデルで近似して局所的に説明する。予測の解釈が人間にとって直感的に分かりやすい。

G検定ではバイアスの原因（データの偏り）・XAIの目的（説明可能性）・SHAP と LIME の概要が問われます。`,
      termIds: ['ml_bias', 'xai', 'fairness', 'transparency', 'accountability', 'shap', 'lime_xai'],
    },
  ],
  keyTermIds: [
    'poc',
    'mlops',
    'data_leakage',
    'model_drift',
    'health_monitoring',
    'ai_project_lifecycle',
    'xai',
    'ml_bias',
  ],
  keyPoints: [
    'AIプロジェクトは企画→データ収集→PoC→モデル開発→評価→デプロイ→運用というライフサイクルで進む',
    'PoC（概念実証）ではデータ品質・精度達成可能性・ビジネス価値を本格開発前に検証する',
    'データリーケージは将来情報が訓練データに混入し、実際の本番精度と評価精度が乖離する問題',
    'モデルドリフトは社会環境変化により導入済みモデルの精度が時間とともに低下する現象',
    'ヘルスモニタリングで稼働中のモデルを継続監視し、モデルドリフトを早期検知する',
    'MLOpsはAIシステムの開発から運用・保守までを自動化・効率化する体制・文化・ツールの総称',
    '機械学習バイアスは学習データの偏りが原因で特定の人種・性別に差別的予測をするリスク',
    '説明可能AI（XAI）はモデルの判断根拠を可視化・説明し透明性確保とブラックボックス問題を解決する',
  ],
  exampleQuestionIds: ['ch7-001', 'ch7-005', 'ch7-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 AIプロジェクトライフサイクル・PoC・データリーケージ・モデルドリフト・MLOps・特徴量エンジニアリング・Training-Serving Skew',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:8a1f7483-8869-4721-a3cd-6e2c73ec3152 機械学習バイアス・説明可能AI・AI事業者ガイドライン・社会実装課題・A/Bテスト・シャドウデプロイ',
  ],
  source_ref_supplements: [
    'https://aitc.dentsusoken.com/column/column22/',
    'https://www.school.ctc-g.co.jp/columns/nakai2/nakai271.html',
    'https://zenn.dev/asei/articles/e593da33c53ee4',
    'https://docs.aws.amazon.com/ja_jp/sagemaker/latest/dg/feature-store.html',
    'https://www.pasona.co.jp/clients/service/xtech/column/column155/',
    'https://www.optim.co.jp/media/cat-trend/ai_250509-01',
    'https://avilen.co.jp/ai-knowledge-article/ai-project-process/',
    'https://www.datarobot.com/jp/blog/agent-workforce-platform/',
    'https://www.sotatek.com/jp/blogs/ai-automation-implementation/',
    'https://special.nikkeibp.co.jp/atclh/NXT/24/delltechnologies0412/',
    'https://zenn.dev/tasse/articles/dd2ce78f40d95b',
    'https://note.com/coroeri/n/nca0ef125b96d',
    'https://jp.linkedin.com/pulse/ai-software-bridging-poc-to-production-gap-christos-kotsidimos-rpmnf?tl=ja',
    'https://qiita.com/pandausa/items/e3009bcfe228c77d3632',
    'https://shift-ai.co.jp/blog/56127/',
    'https://schoo.jp/class/11194',
    'https://www.atarayo.co.jp/method/poc-to-production/',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://www.its-artists.com/vertex-ai-mlops-2025/',
    'https://globis.jp/learning-paths/76617246/',
    'https://news.mynavi.jp/techplus/article/20260331-4280085/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-comparison/',
    'https://note.com/gexam_master/n/n19ccd471bec1',
    'https://open.spotify.com/episode/3JNKbf4nboOmAdGIickjS4',
    'https://www.geekly.co.jp/column/cat-position/ai_engineer_certification/',
    'https://www.jdla.org/certificate/general/issues/',
    'https://note.com/gfiddich12years/n/n858e63d94047',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://www.skillupai.com/blog/certification/general-review/',
    'https://www.jdla.org/recommendedbook/',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://note.com/atsonic/n/ne5b8d4e5e6c4',
    'https://note.com/yksjps/n/nf6216ae362a2',
    'https://saycon.co.jp/archives/neta/g-certification-textbook-part-1',
    'https://zenn.dev/tasse/articles/98a1cf882b48f1',
    'https://qiita.com/kmprider/items/8b9718e4807d07fd6b68',
    'https://www.jdla.org/certificate/general/start/',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://www.scskserviceware.co.jp/topics/training/704.html',
    'https://www.simulationroom999.com/blog/jdla-deep-learning-for-general-2020-1/',
    'https://x.com/techtarget_itm/status/2047119528723972403',
    'https://note.com/resta2020/n/n4002736242e6',
    'https://www.skillupai.com/open/cloud005/',
    'https://zero2one.jp/ai-word/mlops/?srsltid=AfmBOopcut5ZvukM58ZqKPFK1FYtyJ7BMMeFol2SuVhSgzuKYRrXfGGo',
    'https://note.com/narumi_ai/n/n363d1cd66200',
    'https://zero2one.jp/ai-word/mlops/?srsltid=AfmBOorJoJyYN5w5RjGZEKnZcu8km66fe9E8n6lHgX_aM1ltg3Kw_VAT',
    'https://e-words.jp/w/MLOps.html',
    'https://ai-trend.jp/business-article/ai-project/mlops1205/',
    'https://www.js-sys.com/case/useful_info/a60',
    'https://www.jdla.org/recommendedbook/study/',
    'https://techtarget.itmedia.co.jp/tt/news/2604/23/news01.html',
    'https://qiita.com/DS27/items/ea719ba584be9966fd06',
    'https://www.isoroot.jp/blog/10418/',
    'https://note.com/lydiacorp/n/nd60d5115f534',
    'https://note.com/bold_4255/n/nc19fa7be9224',
    'https://www.skillupai.com/ai-generalist/',
    'https://zero2one.jp/ai-word/ai-project-cycle/?srsltid=AfmBOopHhAawBSQRmEPMiTL_9cwQGFySbqQyWnZ-eI0SPWZxBLyBUrxY',
    'https://chefyushima.com/ai_development-contract/2176/',
    'https://www.lec-jp.com/general/about/',
    'https://bizroad-svc.com/blog/gkentei-kakomon/',
    'https://www.tcdigital.jp/ai-trend-navi/knowledge/trouble-048',
    'https://www.ibm.com/jp-ja/think/topics/feature-engineering',
    'https://www.databricks.com/jp/blog/supervised-vs-unsupervised-learning',
    'https://www.snowflake.com/ja/fundamentals/mlops/',
    'https://www.reddit.com/r/ArtificialInteligence/comments/1srsorb/why_do_so_many_ai_projects_never_make_it_to/?tl=ja',
    'https://interviewcat.dev/p/ml-interviewcat/feature-engineering',
    'https://qiita.com/tamura__246/items/59b2475972a60ba1d65b',
    'https://ai-stack.ai/ja/what-is-mlops',
    'https://zenn.dev/rwcolinpeng/articles/3ed77925b49213',
    'https://qiita.com/tan0ry0shiny/items/8c6bf6d7c03ae268679a',
    'https://www.alteryx.com/ja/glossary/feature-engineering',
    'https://www.databricks.com/jp/blog/what-is-feature-engineering',
    'https://annotation.brycen.co.jp/column-detail37',
    'https://x.com/hiroki_daichi/status/2015779272628306212',
    'https://www.ultralytics.com/ja/blog/5-reasons-why-computer-vision-models-fail-in-production',
    'https://www.giken.co.jp/column/feature-engineering/',
    'https://jp.linkedin.com/pulse/machine-learning-data-science-from-fundamentals-insights-andrade-uhekf?tl=ja',
    'https://docs.intersystems.com/supplychainlatest/csp/docbookj/DocBook.UI.Page.cls?KEY=GAUTOML_Feature',
    'https://podcasts.apple.com/jp/podcast/%E8%80%B3%E3%81%A7%E5%AD%A6%E3%81%B6g%E6%A4%9C%E5%AE%9A-%E7%AC%AC7%E8%A9%B1-%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD%E3%82%92%E3%82%81%E3%81%90%E3%82%8B%E5%8B%95%E5%90%91-ai%E3%81%AF%E3%81%A9%E3%81%86-%E8%80%83%E3%81%88%E3%82%8B-%E7%9F%A5%E8%AD%98%E8%A1%A8%E7%8F%BE%E3%81%A8%E3%82%A8%E3%82%AD%E3%82%B9%E3%83%91%E3%83%BC%E3%83%88%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0/id1822409963?i=1000714260246',
    'https://zenn.dev/datasciencekun/articles/803de311258a64',
    'https://datachemeng.com/theory_first_or_machine_learning_first_in_feature_engineering/',
    'https://www.kikagaku.co.jp/business/training/blog/g-certificate',
    'https://kn.itmedia.co.jp/kn/articles/2512/24/news059.html',
    'https://shikaku-expert.com/g-test/books/',
    'https://qiita.com/kengo-sk8/items/148cf7c9cab32466e4f5',
    'https://avilen.co.jp/personal/test/g-certificate/',
    'https://www.jdla.org/certificate/general/',
    'https://note.com/domonjo01/n/n75333f8852be',
    'https://ai-skill-note.com/2026/04/06/g-kentei-guide/',
    'https://qiita.com/ichi_zamurai/items/9e056876685e07f20a87',
    'https://statistical.jp/g_examination_2/',
    'https://note.com/sier20_note/n/n651c0d7d38f6',
    'https://info.picaca.jp/24050',
    'https://note.com/lovely_laelia397/n/n6bf9bca615f7',
    'https://www.simulationroom999.com/blog/gkentei-nanka-reason-5axis-cosine-model/',
    'https://zenn.dev/breakedge/articles/6fd57d71aace69',
    'https://toukei-lab.com/g_exam',
    'https://www.alteryx.com/ja/resources/whitepaper/essential-guide-to-explainable-ai',
    'https://zero2one.jp/learningblog/explaining-xai/?srsltid=AfmBOorKuVhdL15S0T2f15rat5KZ68zNSq0u0hRaK6T34JGPACKe4WhO',
    'https://zenn.dev/pluck/articles/d29dafe92cdfc1',
    'https://renue.co.jp/posts/xai-to-wa',
    'https://qiita.com/KamikawaTakato/items/73b748414567d27a9c52',
    'https://www.ibm.com/jp-ja/think/topics/explainable-ai',
    'https://qiita.com/yoshie_ikeno/items/8531377aa178c9d446c8',
    'https://www.ntc-s.co.jp/t-column07/',
    'https://www.skillupai.com/blog/tech/about-xai/',
    'https://mammothclub.com/ja/blog/ai-ml-full-course',
    'https://note.com/ai_teacherv/n/n8b08f949dd12',
    'https://blog.exeo-digitalsolutions.co.jp/2026/01/16/%E3%80%90%E5%BE%B9%E5%BA%95%E8%A7%A3%E8%AA%AC%E3%80%91%E8%AA%AC%E6%98%8E%E5%8F%AF%E8%83%BD%E3%81%AAai%EF%BC%88xai%EF%BC%89%E3%81%A8%E3%81%AF%EF%BC%9F%E3%81%9D%E3%81%AE%E9%87%8D%E8%A6%81%E6%80%A7/',
    'https://www.nobleprog.co.jp/explainable-ai-xai-training',
    'https://www.reddit.com/r/Python/comments/1fleulk/dive_into_machine_learning_free_python_tutorials/?tl=ja',
    'https://symbiorise.com/know-how/kaggle-study/',
    'https://note.com/anri_vc/n/ne6462be5ce9c',
  ],
  relatedChapters: ['ch3', 'ch8'],
};
