import type { LearnChapter } from '../../types/learn';

export const learnCh3: LearnChapter = {
  categoryId: 'ch3',
  title: '機械学習の基礎',
  overview: `機械学習とは、コンピュータが大量のデータを読み込んで、そこからパターンや規則を「自分で学ぶ」技術です。人間が「こういうルールで判断しろ」と逐一プログラムする代わりに、データを見せるだけで判断の仕方を覚えさせます。

この章では機械学習の三大パラダイム（教師あり・教師なし・強化学習）から始め、決定木・ランダムフォレスト・SVM といった代表的なアルゴリズムの仕組みと特徴を学びます。次に、モデルが「練習問題は解けるが本番で失敗する」過学習とその対策、そして「どの評価指標を使うか」という精度評価の考え方へと進みます。評価指標は適合率・再現率・F値・MSE などが出題の中心です。数学が苦手な方でも「なぜこれが必要か」というイメージをつかんでから細かい計算に進むと理解しやすくなります。G検定では概念と具体的な数値の両方が問われます。ch4 のディープラーニングを学ぶ前に、この章の基礎概念をしっかり押さえておくと理解がスムーズになります。`,
  prerequisites: ['ch1'],
  difficulty: 'intermediate',
  sections: [
    {
      heading: `機械学習の3つのパターン：教師あり・なし・強化学習`,
      body: `機械学習は「どうやってデータから学ぶか」によって3種類に分けられます。

まず「教師あり学習」。正解ラベル（答え）付きのデータを使って学習します。メールがスパムかどうかを判定したり、明日の気温を予測したりする場合がこれにあたります。答えが「カテゴリ（種類）」なら分類タスク、「数値」なら回帰タスクと呼びます。実用的なAIの大部分がこのタイプです。

次に「教師なし学習」。正解ラベルのないデータを扱います。似たデータ同士をグループにまとめる「クラスタリング」と、データを少ない次元に圧縮する「次元削減（PCA など）」が代表的です。顧客を購買パターンで分類したり、データの傾向を可視化したりするのに使います。

最後に「強化学習」。「試行錯誤しながら報酬を最大化する」方法を学びます。AIがゲームを何千回も繰り返しながら上達する仕組みで、AlphaGoやロボット制御が代表例。状態・行動・報酬・方策という4つの概念が基本です。

G検定では3種類の違いと代表的な用途を問う問題が多いです。特に「教師なし＝クラスタリング・次元削減」の対応は必須です。`,
      termIds: ['supervised_learning', 'unsupervised_learning', 'reinforcement_learning', 'regression', 'clustering', 'alphago', 'dimensionality_reduction'],
    },
    {
      heading: `決定木・ランダムフォレスト・SVM：代表的なアルゴリズム`,
      body: `「決定木」は Yes/No の条件分岐を繰り返して予測するモデルです。「年収が500万以上か？」→「年齢が40未満か？」といった質問を積み重ねる形で判断します。図として可視化しやすく人間にも理解しやすいのが特徴です。ただし木を深くしすぎると訓練データを「丸暗記」してしまう過学習が起きやすくなります。

「ランダムフォレスト」は複数の決定木を組み合わせるアンサンブル学習（多数決方式）の一種です。訓練データをランダムにサンプリングして異なる決定木を多数作り、それぞれの予測を多数決で集約します。1本の決定木より安定した精度が出るため実用で多用されます。

「SVM（サポートベクターマシン）」はデータを2グループに分ける境界線を「できるだけ広い余白（マージン）を最大化して」引く手法です。余白を大きく取ることで新しいデータにも強くなります。「カーネルトリック」という技術により、直線では分けられない複雑な分布のデータも曲線的に分類できます。

G検定ではそれぞれの特徴・限界・適した場面を問う選択問題が頻出です。アンサンブル学習の仕組みも合わせて覚えましょう。`,
      termIds: ['decision_tree', 'random_forest', 'svm', 'ensemble_learning', 'overfitting', 'kernel_trick'],
    },
    {
      heading: `過学習と正則化：モデルの「暗記」を防ぐ`,
      body: `機械学習でよくある失敗が「過学習（オーバーフィッティング）」です。訓練データの答えを丸暗記してしまい、新しいデータには全く使えなくなる状態です。テストで過去問だけを丸暗記して、少し違う問題が出ると答えられないようなイメージです。

逆に、モデルが単純すぎて訓練データの傾向すら捉えられない状態を「未学習（アンダーフィッティング）」といいます。過学習と未学習の間のちょうど良い複雑さ（バイアスとバリアンスのトレードオフ）を見つけることが目標です。

過学習の主な対策：
- 正則化：パラメータが大きくなりすぎないよう、ペナルティを加える。L1正則化（ラッソ）は不要な特徴量の係数をゼロにするスパースなモデルを作り、L2正則化（リッジ）はすべての係数を均等に小さくします。
- 交差検証：データをk個に分割し、1つを検証用・残りを訓練用にすることをk回繰り返して汎化性能を確認する（k分割交差検証）
- ドロップアウト：学習中にランダムにニューロンを無効化してモデルを鍛える
- データ拡張：学習データを水増ししてモデルが多様なパターンを学ぶようにする
- 早期終了：検証誤差が上昇し始めたら学習を止める

G検定では、過学習が「訓練誤差は小さいが汎化誤差は大きい」状態であること、L1とL2正則化の違い、各対策手法の名前と目的を問われます。`,
      termIds: ['overfitting', 'underfitting', 'regularization', 'cross_validation', 'dropout', 'neuron', 'data_augmentation'],
    },
    {
      heading: `評価指標：精度だけではダメな理由`,
      body: `モデルの良し悪しを測る「評価指標」は、何を目的とするかによって使い分けます。

分類タスクでよく使う指標：
- 正解率（Accuracy）：全体の何割を正しく分類できたか。ただし不均衡データ（例：99%が正常、1%が異常）では「全部正常と予測」だけで99%になってしまい、意味がありません。
- 適合率（Precision）：「陽性と予測したもの」のうち本当に陽性の割合。スパムメール検知で「正常メールをスパムと誤判定したくない」場合に重視します。
- 再現率（Recall）：「本当に陽性のもの」のうち正しく陽性と予測できた割合。がん診断で「見逃しをゼロにしたい」場合に重視します。
- F値：適合率と再現率の調和平均。両方バランスよく評価したい場合に使います。
- AUC-ROC：分類のしきい値を変えたときの性能をまとめた指標。値が1に近いほど良いモデルです。

回帰タスクでは MSE（平均二乗誤差）や RMSE（その平方根）を使います。外れ値があると値が大きく変わるため、外れ値への感度を考慮して MAE（平均絶対誤差）と使い分けます。

G検定では混同行列から各指標を計算する問題と、「どの指標を使うべきか」を状況から判断する問題が出ます。適合率と再現率のトレードオフを理解しておくことが重要です。`,
      termIds: ['precision', 'recall', 'f_score', 'confusion_matrix', 'accuracy', 'auc', 'roc_curve', 'mse'],
    },
    {
      heading: `ロジスティック回帰・ナイーブベイズ・勾配ブースティング`,
      body: `分類でよく使われるアルゴリズムをさらに3つ押さえましょう。

「ロジスティック回帰」は名前に「回帰」とありますが、実際は分類に使います。入力特徴量を足し合わせてシグモイド関数に通すことで「あるクラスに属する確率（0〜1）」を出力します。シンプルで解釈しやすく、どの特徴量がどれだけ予測に影響しているかが分かりやすいため、医療や金融での意思決定支援でも使われます。

「ナイーブベイズ」はベイズの定理を使った確率的分類器です。各特徴量が互いに独立して働くと仮定（ナイーブ＝単純）するため計算が軽く、テキスト分類（スパムフィルタなど）で今も広く使われています。学習データが少なくても機能しやすい特徴があります。

「勾配ブースティング」は精度が低い「弱い学習器」を順番に積み重ねる手法です。前のモデルが間違えた部分を次のモデルが重点的に学ぶことで、全体として高精度なモデルを作ります。XGBoostやLightGBMが有名で実用精度は高いですが、ハイパーパラメータ調整が難しく過学習への注意が必要です。

G検定ではこれらの特徴と「どの場面に向いているか」を問う問題が出ます。`,
      termIds: ['logistic_regression', 'sigmoid_function', 'naive_bayes', 'boosting', 'loss_function', 'hyperparameter', 'gradient_boosting', 'xgboost', 'overfitting'],
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
