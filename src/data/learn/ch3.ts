import type { LearnChapter } from '../../types/learn';

export const learnCh3: LearnChapter = {
  categoryId: 'ch3',
  title: '機械学習の基礎',
  overview:
    '機械学習とは、大量のデータからルールやパターンを自律的に学習し、予測・分類・判断を行う技術の総称である。主要な学習パラダイムとして、正解ラベル付きデータで学習する「教師あり学習」、ラベルなしデータの構造を発見する「教師なし学習」、試行錯誤で報酬を最大化する「強化学習」の3種類がある。教師あり学習ではタスクにより分類と回帰に分かれ、決定木・SVM・ランダムフォレストなどのアルゴリズムが使われる。教師なし学習にはk-means法などのクラスタリングと主成分分析（PCA）などの次元削減がある。モデルの評価には適合率・再現率・F値（分類）やMSE・RMSE（回帰）が用いられる。機械学習の重要課題として、訓練データに過度に適合する「過学習」とその対策である「正則化」「交差検証」がある。また、複数モデルを組み合わせて精度を高める「アンサンブル学習」も実務で広く使われる手法である。',
  prerequisites: ['ch1'],
  difficulty: 'intermediate',
  sections: [
    {
      heading: '機械学習の3つのパラダイム：教師あり・なし・強化学習',
      body: '機械学習は「どんなデータでどう学ぶか」によって3つのパラダイムに分類されます。「教師あり学習」は正解ラベル付きデータで学習し、メール迷惑フィルタや画像分類などに使われます。出力が「分類（カテゴリ）」か「回帰（数値）」かでさらに分かれます。「教師なし学習」はラベルなしデータからパターンを発見します。似たデータをグループ化する「クラスタリング（k-means等）」と、データの次元を圧縮する「次元削減（PCA等）」が代表的な手法です。「強化学習」は環境との試行錯誤を通じて「報酬」を最大化する行動を学びます。ゲームAIや自動運転の意思決定などに活用されます。G検定ではこの3分類とそれぞれの代表アルゴリズムの理解が必須です。',
      beginnerBody: '機械学習は、データを使って学ぶ方法が3つのタイプに分かれています。まず「教師あり学習」は、正しい答えがついたデータを使って学びます。例えば、迷惑メールを判別するフィルタや、画像の中の物体を分類するのに使われます。この学習は、結果が「カテゴリ（分類）」か「数値（回帰）」に分かれます。\n\n次に「教師なし学習」は、正しい答えがないデータからパターンを見つけ出します。似たデータをまとめる「クラスタリング」や、データの情報を圧縮する「次元削減」が代表的な方法です。\n\n最後に「強化学習」は、環境とやり取りしながら最適な行動を学ぶ方法です。ゲームのAIや自動運転車の判断に使われています。G検定では、これらの3つのタイプとそれぞれの代表的な方法を理解することが重要です。',
      intermediateBody: `機械学習は、データを用いて自動的にパターンやルールを学習し、予測や分類を行う技術です。この技術は主に「教師あり学習」「教師なし学習」「強化学習」の3つのパラダイムに分類されます。

「教師あり学習」は、正解ラベルが付与されたデータを使用してモデルを訓練します。例えば、スパムメールフィルタや画像認識タスクでは、正しいラベルが与えられたデータを基に、モデルが学習を行います。この学習はさらに「分類」と「回帰」に分かれ、分類では決定木やサポートベクターマシン（SVM）、回帰では線形回帰やリッジ回帰などのアルゴリズムが用いられます。

「教師なし学習」は、ラベルのないデータから隠れた構造を発見する手法です。代表的な手法には、データをグループ化する「クラスタリング」（例：k-means法）や、データの次元を圧縮する「主成分分析（PCA）」があります。これにより、データの特徴を抽出し、可視化やさらなる分析に役立てます。

「強化学習」は、エージェントが環境と相互作用しながら報酬を最大化する行動を学ぶ手法です。ゲームAIや自動運転車の制御に利用され、試行錯誤を通じて最適な行動を見つけ出します。強化学習では、Q学習や深層強化学習が代表的なアルゴリズムです。

G検定では、これらの学習パラダイムとそれぞれの代表的なアルゴリズムの理解が求められます。特に、各手法の適用例や利点、欠点を把握することが重要です。`,
      termIds: ['supervised_learning', 'unsupervised_learning', 'reinforcement_learning', 'logistic_regression'],
    },
    {
      heading: '代表的なアルゴリズム：決定木・SVM・ランダムフォレスト',
      body: '教師あり学習の代表アルゴリズムを理解しましょう。「決定木」は「年齢が30歳以上か？」「収入が高いか？」のようなYes/No質問を繰り返してツリー状に分類するモデルです。直感的に理解しやすい反面、訓練データへの過学習（過剰適合）が起きやすい欠点があります。「SVM（サポートベクターマシン）」は2クラスのデータを最大マージンで分離する境界線を学習します。「カーネルトリック」により非線形な境界にも対応できます。「ランダムフォレスト」は複数の決定木をランダムなデータ・特徴量のサブセットで学習し、多数決で予測する「バギング」手法です。1本の決定木の弱点を補い、汎化性能が高いアンサンブル学習の代表例です。',
      beginnerBody: '「決定木」は、質問を繰り返してデータを分類する方法です。例えば、「年齢が30歳以上か？」や「収入が高いか？」といったYes/Noの質問を使って、情報をツリーの形で整理します。この方法は直感的で分かりやすいですが、特定のデータに合わせすぎてしまうことがあるため注意が必要です。「SVM（サポートベクターマシン）」は、2つのグループを分けるための最適な境界線を見つける手法で、複雑な形にも対応できます。「ランダムフォレスト」は、たくさんの決定木を使って予測を行う方法で、各木の結果を多数決で決めます。これにより、単独の決定木の弱点を克服し、より正確な予測が可能になります。',
      intermediateBody: `機械学習における教師あり学習の代表的なアルゴリズムには、決定木、サポートベクターマシン（SVM）、およびランダムフォレストがあります。

決定木は、データを「年齢が30歳以上か？」や「収入が高いか？」といったYes/Noの質問を繰り返すことで分類するモデルです。このツリー構造は直感的で理解しやすいですが、訓練データに過剰適合しやすいという欠点があります。特に、データのノイズに敏感であるため、モデルの汎化性能が低下することがあります。

SVMは、2つのクラスを分けるための最適な境界線（超平面）を見つける手法です。SVMの特徴は、データポイント間のマージンを最大化することで、分類精度を向上させる点です。また、「カーネルトリック」を使用することで、線形分離が難しい非線形データにも対応可能です。これにより、複雑なデータセットに対しても高い性能を発揮します。

ランダムフォレストは、複数の決定木を用いたアンサンブル学習の手法です。各決定木はランダムに選ばれたデータと特徴量のサブセットで学習し、最終的な予測は多数決で決定されます。この手法は、単一の決定木の過学習の問題を軽減し、全体の予測精度を向上させることができます。ランダムフォレストは、分類と回帰の両方に利用でき、実務において非常に広く使われています。

これらのアルゴリズムは、それぞれ異なる特性を持ち、データの性質やタスクに応じて使い分けることが重要です。`,
      termIds: ['decision_tree', 'svm', 'random_forest', 'ensemble_learning'],
    },
    {
      heading: '過学習と正則化：モデルの汎化性能を守る',
      body: '機械学習で最も重要な概念の1つが「過学習（オーバーフィッティング）」です。訓練データに対して非常に高い精度を示す一方、見たことのない新しいデータ（テストデータ）で精度が大幅に落ちる現象です。例えば試験の過去問を丸暗記してしまい、初見問題に対応できなくなる状態に例えられます。対策として「正則化」があります。これはモデルのパラメータが大きくなりすぎないよう制約を加え、シンプルなモデルを維持する技術です（L1正則化・L2正則化など）。「交差検証（クロスバリデーション）」はデータを複数の折（fold）に分け、異なる部分をテストに使って汎化性能を評価する手法で、データが少ない場合でも信頼性の高い評価が得られます。',
      beginnerBody: '機械学習で大切な考え方の一つが「過学習（かがくしゅう）」です。これは、学習に使ったデータにはとてもよく適応するのに、新しいデータにはうまく対応できない状態を指します。たとえば、試験の過去問を覚えすぎて、初めて見る問題には答えられないようなものです。この問題を解決するために「正則化（せいそくか）」という方法があります。これは、モデルが複雑になりすぎないように制限をかけて、シンプルな形を保つ技術です。また、「交差検証（こうさけんしょう）」という手法を使うと、データをいくつかの部分に分けて、異なる部分をテストに使うことで、モデルの性能をより正確に評価できます。これにより、少ないデータでも信頼できる結果が得られます。',
      intermediateBody: `機械学習における「過学習（オーバーフィッティング）」は、モデルが訓練データに対して非常に高い精度を示す一方で、未知のデータに対する予測精度が著しく低下する現象を指します。これは、モデルが訓練データのノイズや特異性に過剰に適応してしまうために起こります。例えば、特定の試験問題を丸暗記することで、初めて見る問題には対応できなくなる状況に例えられます。

過学習を防ぐための主要な手法が「正則化」です。正則化は、モデルのパラメータが過度に大きくなることを防ぎ、シンプルなモデルを維持するための技術です。具体的には、L1正則化（ラッソ回帰）やL2正則化（リッジ回帰）などがあり、これらは損失関数にペナルティ項を追加することで、モデルの複雑さを制御します。L1正則化は特に特徴選択に有効であり、不要な変数を排除する効果があります。一方、L2正則化は全体的な重みを小さく保つことで、モデルの汎化性能を向上させます。

さらに、「交差検証（クロスバリデーション）」も重要な手法です。これはデータセットを複数の部分に分割し、異なる部分をテストデータとして使用することで、モデルの汎化性能を評価します。この手法により、データが少ない場合でも信頼性の高い評価が可能となり、過学習のリスクを軽減します。交差検証は、モデルの選択やハイパーパラメータの調整においても広く利用されています。

これらの手法を適切に活用することで、機械学習モデルの汎化性能を高め、実務における予測精度を向上させることができます。`,
      termIds: ['overfitting', 'regularization', 'cross_validation'],
    },
    {
      heading: 'モデル評価指標：適合率・再現率・F値・MSE・RMSE',
      body: 'モデルの性能を測る評価指標は、タスクによって使い分けます。分類タスクでは「適合率（Precision）」と「再現率（Recall）」が基本です。適合率は「陽性と予測したうち本当に陽性の割合」で、誤検知を減らしたい場合（スパムフィルタ等）に重視します。再現率は「本当の陽性のうち陽性と予測できた割合」で、見逃しを減らしたい場合（がん検診等）に重視します。「F値（F1スコア）」は適合率と再現率の調和平均で、両者のバランスをとった指標です。回帰タスクでは「MSE（平均二乗誤差）」と「RMSE（平均二乗誤差の平方根）」が代表的です。MSEは予測値と正解の差の二乗平均で外れ値に敏感、RMSEはMSEの平方根で元の単位と同じスケールになるため解釈が容易です。',
      beginnerBody: 'モデルの性能を測るための指標は、行う作業によって異なります。分類の作業では「適合率」と「再現率」が重要です。適合率は、スパムメールのように「正しいと予測した中で、実際に正しかった割合」を示し、誤ってスパムと判断することを減らしたいときに使います。一方、再現率は「実際に正しいものの中で、正しく予測できた割合」で、がん検診などで見逃しを減らしたいときに重視されます。「F値」はこの二つのバランスを取る指標です。回帰の作業では「MSE」と「RMSE」が使われます。MSEは予測と実際の差を二乗して平均したもので、外れ値に影響されやすいです。RMSEはその平方根で、元の単位と同じになるため理解しやすいです。',
      intermediateBody: `機械学習モデルの性能を評価するための指標は、タスクの種類によって異なります。分類タスクでは、主に「適合率（Precision）」と「再現率（Recall）」が重要です。適合率は、モデルが陽性と予測した中で実際に陽性であった割合を示し、誤検知を減らしたい場合に重視されます。例えば、スパムフィルタリングでは、誤って正常なメールをスパムと判断することを避けるため、適合率が重要です。一方、再現率は、実際に陽性であるものの中で、モデルが正しく陽性と予測できた割合を示します。がん検診などのシナリオでは、見逃しを減らすことが求められるため、再現率が重視されます。

「F値（F1スコア）」は、適合率と再現率の調和平均であり、両者のバランスを取る指標です。特に、クラスの不均衡がある場合に有用です。

回帰タスクにおいては、「MSE（平均二乗誤差）」と「RMSE（平方根平均二乗誤差）」が代表的な評価指標です。MSEは、予測値と実際の値の差を二乗し、その平均を取ることで計算されます。このため、外れ値に敏感であり、大きな誤差がモデルの評価に大きく影響します。RMSEはMSEの平方根を取ることで得られ、元のデータと同じ単位で表現されるため、解釈が容易です。これにより、モデルの誤差の大きさを直感的に理解しやすくなります。

これらの評価指標を適切に使い分けることで、モデルの性能を正確に把握し、改善点を見出すことが可能になります。`,
      termIds: ['precision', 'recall', 'f_score', 'mse', 'rmse'],
    },
    {
      heading: 'ロジスティック回帰・ナイーブベイズ・勾配ブースティング：分類の主要アルゴリズム',
      body: '教師あり学習には決定木・SVM以外にも重要なアルゴリズムがあります。「ロジスティック回帰」は名前に「回帰」が付きますが、実際は二値分類に用いる代表的な手法です。シグモイド関数を使って出力を0〜1の確率に変換し、「スパムか否か」などの判断に活用されます。線形モデルであるため解釈しやすく、医療・金融など説明責任が求められる場面で広く使われます。「ナイーブベイズ」はベイズ定理を基に、各特徴量が「条件付き独立（互いに独立して目的変数に影響する）」という仮定のもとで分類します。実際にはこの仮定が成立しない場面も多いですが、テキスト分類などで計算効率が高く実用的な結果を出します。「勾配ブースティング」はアンサンブル学習の一種で、弱学習器（浅い決定木）を順次追加しながら前モデルの誤差を修正していく手法です。XGBoost・LightGBMなどの実装が競技データ分析で高精度を発揮し、実務でも広く採用されています。',
      beginnerBody: 'ロジスティック回帰、ナイーブベイズ、勾配ブースティングは、データを分類するための重要な手法です。ロジスティック回帰は、ある事象が起こる確率を0から1の間で計算し、例えば「このメールはスパムか？」といった判断に使われます。ナイーブベイズは、データの特徴が互いに独立していると仮定し、簡単に分類を行います。例えば、テキストの内容からその文書がどのカテゴリに属するかを判断するのに役立ちます。勾配ブースティングは、複数の簡単なモデルを組み合わせて、より正確な予測を行う方法です。これにより、特に競技データ分析などで高い精度を実現しています。これらの手法は、医療や金融などの分野でも広く利用されています。',
      intermediateBody: `機械学習における分類アルゴリズムとして、ロジスティック回帰、ナイーブベイズ、勾配ブースティングは重要な役割を果たします。

ロジスティック回帰は、二値分類に特化した手法であり、シグモイド関数を用いて出力を0から1の範囲に変換します。この特性により、例えば「このメールはスパムか？」という判断を確率的に行うことができます。線形モデルであるため、結果の解釈が容易で、医療や金融などの分野で説明責任が求められる場面でも広く利用されています。

ナイーブベイズは、ベイズの定理に基づく手法で、各特徴量が条件付き独立であると仮定します。この仮定により、計算が効率的になり、特にテキスト分類などのタスクで実用的な結果を出します。実際には特徴量が独立でない場合も多いですが、ナイーブベイズはそのシンプルさから多くの実務で利用されています。

勾配ブースティングは、アンサンブル学習の一種で、複数の弱学習器（通常は浅い決定木）を逐次的に追加し、前のモデルの誤差を修正する手法です。このプロセスにより、モデルの精度が向上します。XGBoostやLightGBMなどの実装は、特に競技データ分析において高い精度を発揮し、実務でも広く採用されています。これらの手法は、データの特性に応じて適切に選択されることで、効果的な分類を実現します。`,
      termIds: ['logistic_regression', 'sigmoid_function', 'ensemble_learning'],
    },
  ],
  keyTermIds: [
    'supervised_learning',
    'unsupervised_learning',
    'reinforcement_learning',
    'decision_tree',
    'random_forest',
    'svm',
    'overfitting',
    'regularization',
    'ensemble_learning',
    'cross_validation',
  ],
  keyPoints: [
    '機械学習の3つのパラダイム：教師あり学習（ラベルあり）・教師なし学習（ラベルなし）・強化学習（報酬最大化）',
    '教師あり学習は分類（カテゴリ予測）と回帰（数値予測）に大別される',
    '決定木は特徴量の条件で分岐するツリー構造モデルで、単独では過学習しやすい',
    'ランダムフォレストは複数の決定木をバギングで組み合わせたアンサンブル学習法で汎化性能が高い',
    'SVMはマージン最大化の原理でクラス境界を学習し、カーネルトリックで非線形問題にも対応する',
    '過学習は訓練データへの過度な適合で汎化性能が低下する現象。正則化・ドロップアウト・交差検証で対処する',
    '評価指標：適合率（偽陽性を減らしたい場合に重視）、再現率（偽陰性を減らしたい場合に重視）、F値（両者の調和平均）',
    '教師なし学習のクラスタリング（k-means等）と次元削減（PCA等）はラベルなしデータの構造発見に使う',
  ],
  exampleQuestionIds: ['ch3-001', 'ch3-003', 'ch3-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 機械学習パラダイム・教師あり/なし学習・強化学習・決定木・SVM・アンサンブル',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 過学習・正則化・交差検証・評価指標（適合率・再現率・F値・MSE・RMSE）・ロジスティック回帰・ナイーブベイズ・勾配ブースティング',
  ],
  source_ref_supplements: [
    'https://zero2one.jp/ai-word/gradient-boosting/?srsltid=AfmBOooHqI46d2eYnBLJVPbfPrp_DDUuDvvpMPctihjlVjLe-lpqoooS',
    'https://note.com/coroeri/n/nc8f717e2e0f8',
    'https://ai4mdx.com/g/study_flow.html',
    'https://note.com/firm_bonobo7417/n/nda44f11e9c2b',
    'https://www.isoroot.jp/blog/10418/',
    'https://www.agaroot.jp/datascience/column/gtest-text/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://www.jdla.org/recommendedbook/study/',
    'https://sikakuma.jp/article/g-kentei-how-to-study',
    'https://www.jdla.org/certificate/general/issues/',
    'https://note.com/chanponman/n/n2882283f1b08',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://yusuketakami.com/?p=2157',
    'https://python-ai-learn.com/2021/02/15/g-exam2/',
    'https://zenn.dev/breakedge/articles/6fd57d71aace69',
    'https://www.simulationroom999.com/blog/g-test-solve-example-questions-01/',
    'https://qiita.com/s5023111/items/2caf13471f10d17c3643',
    'https://toukei-lab.com/g_exam',
    'https://note.com/vast_cosmos500/n/n46800613a1b4',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://www.tryeting.jp/column/1301/',
    'https://www.elastic.co/jp/blog/popular-ml-algorithms',
    'https://note.com/gyoza_tencho/n/nb3ef990f2360',
    'https://fan-adn.github.io/ist-textbook-open/classif-theory.html',
    'http://www.shuwasystem.co.jp/book/9784798067773.html',
    'https://freelance.shiftinc.jp/column/machine-learning-algorithm/',
    'https://qiita.com/rikuProgramer/items/dd5877711c96a2e9508a',
    'https://www.agaroot.jp/datascience/column/r07-16/',
    'https://syuminokobeya.blog/2025/05/10/%E3%80%90%E3%83%A2%E3%83%87%E3%83%AB%E6%AF%94%E8%BC%83%E3%80%91svm%E3%83%BB%E6%B1%BA%E5%AE%9A%E6%9C%A8%E3%83%BB%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%83%95%E3%82%A9%E3%83%AC%E3%82%B9%E3%83%88/',
    'https://www.vidhex.ai/jp/blog/machine-learning-algorithms/',
    'https://www.dsk-cloud.com/blog/10-machine-algorithm',
    'https://note.com/hotate_nt/n/n0d5d0f4b0148',
    'https://www.skillupai.com/blog/book-deep-learning-for-general/',
    'https://qiita.com/syuki-read/items/dba0b61c0443011bab5c',
    'https://www.jdla.org/news/20240514001/',
    'https://benjamin.co.jp/blog/technologies/exam-certificate-general/',
    'https://qiita.com/superrino130/items/3cbd3380fb41e07ffba8',
    'https://www.ric.co.jp/book/qualification3/detail/1393',
    'https://techblog.nhn-techorus.com/archives/13474',
    'https://note.com/gexam_master/n/n19ccd471bec1',
    'https://ai-skill-note.com/2026/04/06/g-kentei-guide/',
    'https://renue.co.jp/posts/generative-ai-certification-g-exam-comparison-guide-2026',
    'https://globis.jp/learning-paths/76617246/',
    'https://www.insource.co.jp/bup/bup_g-test-preparation.html',
    'https://saycon.co.jp/archives/neta/g%E6%A4%9C%E5%AE%9A%E3%81%AE%E7%84%A1%E6%96%99%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88',
    'https://note.com/domonjo01/n/n8a053969f643',
    'https://qiita.com/pandausa/items/2930e07a29e5049c22b7',
    'https://avilen.co.jp/personal/knowledge-article/regularization/',
    'https://note.com/vast_cosmos500/n/n2a007e757ba3',
    'https://diver.diveintocode.jp/dive_into_exam/3',
    'https://zero2one.jp/ai-word/generalization-ability/?srsltid=AfmBOop2cAedP3G8GHfFcmWRzHiukhRItluNEZr9o02NZMlHU4gxCGUD',
    'https://zero2one.jp/ai-word/l2-normalization/?srsltid=AfmBOooCuGwyQVowAUbSiN5Lkp86NYBJymEwMtTz_OLkCLATNzgUI10L',
    'https://watlab-blog.com/2020/02/01/gexam-deeplearning/',
    'https://saycon.co.jp/archives/neta/g-certification-textbook-part-1',
    'https://qiita.com/pandausa/items/e4ea1d9c1cb42f75c55b',
    'https://www.hello-statisticians.com/ml/deeplearning/regularization_dl1.html',
    'https://gkentei.techblog.jp/archives/25022246.html',
    'https://knmts.com/310/',
    'https://www.simulationroom999.com/blog/gkentei-practical-bridge-neural-network-essential-logitsloss-optimizers/',
    'https://zenn.dev/tasse/articles/4200f0f35f498a',
    'https://ikikati.com/%E3%80%90g%E6%A4%9C%E5%AE%9A%E5%AF%BE%E7%AD%96%E3%80%91%E6%A9%9F%E6%A2%B0%E5%AD%A6%E7%BF%92%E3%81%AE%E5%88%86%E9%A1%9E%E5%95%8F%E9%A1%8C%E3%82%92%E5%AE%8C%E5%85%A8%E6%94%BB%E7%95%A5%EF%BC%81%E7%A8%AE/',
    'https://avilen.co.jp/personal/test/g-certificate/',
    'https://tt-tsukumochi.com/archives/11841',
    'https://toukei-lab.com/rmse_mae_mse',
    'https://zero2one.jp/ai-word/accuracy-precision-recall-f-measure/?srsltid=AfmBOopUixYOJ-d8hs4Dn7m4qlh5YFmfp6c-KQVNnjUpHrCVwVQxxcdU',
    'https://daily-life-ai.com/1997/',
    'https://g-ken-master.com/glossary/4121/',
    'https://note.com/lovely_laelia397/n/n9538a7ebd701',
    'https://masassiah.xyz/archives/935',
    'https://saycon.co.jp/archives/neta/%E6%AD%A3%E8%A7%A3%E7%8E%87%E3%81%A8%E9%81%A9%E5%90%88%E7%8E%87%E3%81%AE%E9%81%95%E3%81%84%E3%81%A8%E3%81%AF%EF%BC%9F%E6%B7%B7%E4%B9%B1%E3%81%97%E3%82%84%E3%81%99%E3%81%84%E8%A9%95%E4%BE%A1%E6%8C%87',
    'https://tt-tsukumochi.com/archives/5909',
    'https://note.com/narumi_ai/n/n4c1f841fa607',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://daily-life-ai.com/1981/',
    'https://note.com/bold_4255/n/n98a1dd8cb4a4',
    'https://zero2one.jp/ai-word/rmse/?srsltid=AfmBOoqrBR9CoE-jgRt6uRb4czFIdVNTat0Rwrc0FNzQ1yTXT4gecRPZ',
    'https://zero2one.jp/learningblog/evaluation-metrics-for-machine-learning/?srsltid=AfmBOopzAtTrqKQ54aKCB6Tqak22-6naXPFaWkHm3BZMLJT7xdX3mhdj',
    'https://zero2one.jp/learningblog/evaluation-metrics-for-machine-learning/?srsltid=AfmBOorkPIpE7HDrDs6qTv4xjrypOeKt8UeeT0bgpqQlxUIv9q8tGC6H',
    'https://zenn.dev/tasse/articles/d6942f2ccd59cd',
    'https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall?hl=ja',
    'https://qe.hpeo.jp/entry/dlg/e43',
    'https://note.com/kens_reading1/n/nd20f89079166',
    'https://ikikati.com/easy-and-thorough-explanation-of-gradient-boosting-to-pass-the-g-certification-test-with-illustrations-for-beginners/',
    'https://daily-life-ai.com/1663/',
    'https://g-ken-master.com/glossary/4261/',
    'https://tt-tsukumochi.com/archives/9555',
    'https://qiita.com/msys825/items/8666118f44211c8fac2d',
    'https://qiita.com/masaya8028/items/7a84dae586c5f27eb830',
    'https://note.com/narumi_ai/n/n564dd9efac3f',
    'https://ameblo.jp/greenteacoffeewoman/entry-12946642664.html',
    'https://www.jdla.org/certificate/general/start/',
    'https://product.istudy.ne.jp/course/21sl0963061-2/',
    'https://zero2one.jp/ai-word/gradient-boosting/?srsltid=AfmBOopVtFtLRudWuzelBlDETWkIM46CURACjwm87whUyWBwamLdjT_5',
    'https://zero2one.jp/ai-word/logistic-regression/?srsltid=AfmBOoqcXxfJFwQTsvuzfRgU_eznNJS9JxTZn7-kQyAdokjF1XRf8HJX',
    'https://note.com/kens_reading1/n/nfb03aeca1e69',
    'https://tt-tsukumochi.com/archives/5486',
    'https://note.com/study_ai/n/nfefcf450c8bf',
    'https://statisticsschool.com/%E3%80%90xgb%E3%80%91%E4%BA%A4%E5%B7%AE%E6%A4%9C%E8%A8%BC%E6%B3%95%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%9F%E5%8B%BE%E9%85%8D%E3%83%96%E3%83%BC%E3%82%B9%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0%E6%B1%BA/',
    'https://coeteco.jp/articles/13146',
    'https://note.com/brisk_rabbit6105/n/nb1e9f95c8772',
    'https://aiacademy.jp/media/?cat=130',
    'https://note.com/fine_fox689/n/nf280f286994b',
    'https://www.codexa.net/jdla-generalist-test/',
    'https://zenn.dev/tasse/articles/ccaa22404c858c',
    'https://content.lightworks.co.jp/contents/course/posts/eduleap-generalist/',
    'https://www.skillupai.com/ai-generalist/',
    'https://gkentei.techblog.jp/archives/24897741.html',
    'https://note.com/brisk_rabbit6105/n/n7400af297f6f',
    'https://ameblo.jp/greenteacoffeewoman/entry-12948044705.html',
    'https://saycon.co.jp/archives/neta/g',
    'https://boochi-engineer.net/archives/4102',
    'https://app.statisticsschool.com/practice/g-certification/',
  ],
  relatedChapters: ['ch4'],
};
