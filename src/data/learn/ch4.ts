import type { LearnChapter } from '../../types/learn';

export const learnCh4: LearnChapter = {
  categoryId: 'ch4',
  title: 'ディープラーニングの概要',
  overview: `ディープラーニング（深層学習）は、機械学習の一手法で「脳の神経回路」を模したモデルを使います。多数の層を重ねることで、画像・音声・文章などから複雑なパターンを自動で学習できるため、第3次AIブームを牽引した中心技術です。

この章では、ニューラルネットワークの基本構造から始め、「なぜ活性化関数が必要か」「どうやって学習するか（誤差逆伝播法・勾配降下法）」「深い層で起こる問題と対策」を順に学びます。数式が怖く感じる方も多いですが、G検定では仕組みのイメージと各技術の役割を問う問題が中心です。「この部品は何のためにあるのか」という視点で読むと整理しやすくなります。最後に過学習対策（ドロップアウト・バッチ正規化など）とハイパーパラメータの考え方も押さえます。ch3の機械学習基礎を理解した上で読むと、「なぜ深い層が必要か」「どこがシンプルな機械学習と違うか」がより鮮明になります。`,
  prerequisites: ['ch3'],
  difficulty: 'intermediate',
  sections: [
    {
      heading: `ニューラルネットワークの基本構造`,
      body: `ニューラルネットワークは、脳の神経細胞（ニューロン）のつながりをコンピュータで模したモデルです。数値を受け取り、重みを掛けて足し合わせ、次の層に渡す、という処理を何層も重ねます。

構造は「入力層 → 隠れ層（複数）→ 出力層」の3種類。入力層はデータを受け取り、隠れ層が特徴を学習・変換し、出力層が最終的な予測結果（分類確率や数値）を出します。ディープラーニングは隠れ層を「深く（ディープ）」積んだものです。浅い層では「線や角」など単純な特徴を学び、深くなるほど「顔」「文字」など抽象的な概念を学べます。

なお、すべての前の層と次の層が繋がる「全結合層」は汎用的ですが、画像には畳み込み層（CNN）、文章・音声には RNN や Transformer など、データの構造に合わせた変形版も使われます（詳しくは ch5）。

G検定では層の役割と「ディープ=多層」という意味を正確に把握しましょう。`,
      termIds: ['neural_network', 'deep_learning', 'neuron', 'activation_function', 'hidden_layer', 'transformer', 'convolutional_layer', 'fully_connected_layer'],
    },
    {
      heading: `活性化関数：「非線形」がなぜ必要か`,
      body: `各ニューロンが値を受け取って次の層に渡すとき、単純に足し合わせるだけでは不十分です。どれだけ層を重ねても「掛けて足す」だけなら、最終的に一枚の単純な計算に潰せてしまいます。これでは深くした意味がありません。

そこで各ニューロンの出力に「活性化関数」という変換をかけます。これが「非線形性」を生み出し、複雑なパターンを学習できるようにします。主な活性化関数：
- シグモイド関数：出力を0〜1に変換。確率の表現に使うが、深い層では勾配消失が起きやすい。
- ReLU（ランプ関数）：入力が0以下なら0、正なら入力をそのまま出力。計算が軽く勾配消失が起きにくいため、隠れ層で最もよく使われる。
- tanh：出力が−1〜1。シグモイドより中心化されているが同様の問題あり。

G検定では各活性化関数の特徴と用途、「勾配消失との関係」が問われます。ReLU が現在の主流である理由を理解しておきましょう。`,
      termIds: ['activation_function', 'sigmoid_function', 'relu', 'neuron', 'hidden_layer'],
    },
    {
      heading: `学習の仕組み：誤差逆伝播法と勾配降下法`,
      body: `ニューラルネットワークが「学習する」とは、パラメータ（重み）を少しずつ調整して予測精度を上げることです。その仕組みを2段階で理解しましょう。

まず「損失関数」で「予測がどれだけ外れているか」を数値化します（損失＝誤差の大きさ）。この損失を小さくするように重みを更新するのが「勾配降下法」です。山の斜面で最も急な下り坂方向に一歩ずつ進むイメージです。

しかし多層ネットワークで各重みへの影響を計算するのは大変です。そこで「誤差逆伝播法（バックプロパゲーション）」を使います。出力層から入力層に向かって、「この重みが損失に与えた影響（勾配）」を逆向きに効率よく計算する方法です。

実際には全データではなく一部（ミニバッチ）を使って更新する「SGD（確率的勾配降下法）」や、更新幅を自動調整するAdamなどが使われます。学習率（1回の更新の大きさ）が大きすぎると発散し、小さすぎると収束が遅くなります。

G検定では誤差逆伝播法の目的と勾配降下法の仕組み、学習率の役割が問われます。`,
      termIds: ['backpropagation', 'gradient_descent', 'loss_function', 'sgd', 'mini_batch', 'neural_network', 'adam', 'learning_rate'],
    },
    {
      heading: `深い層の課題：勾配消失と勾配爆発`,
      body: `層を深くするほど表現力は上がりますが、学習が難しくなるという問題も生じます。代表的な問題が「勾配消失」と「勾配爆発」です。

勾配消失は、誤差逆伝播で勾配を伝えるとき、層を逆向きに通るたびに数値が小さくなり、入力層に近い層の重みがほとんど更新されなくなる現象です。シグモイドは出力が0か1に近づくと勾配がほぼゼロになるため特に起きやすく、ReLU に置き換えることで大幅に改善されました。

逆に勾配が層を通るたびに大きくなりすぎる「勾配爆発」も問題になります。対策として「勾配クリッピング（一定以上の大きさになったら制限する）」が使われます。

また「スキップ結合（残差結合）」は、ある層の出力をいくつか先の層に直接足し合わせる構造で、勾配の通り道を確保してとても深いネットワーク（ResNetなど）の学習を可能にしました。

G検定では勾配消失の原因・症状・対策（ReLU・スキップ結合）がセットで問われます。`,
      termIds: ['backpropagation', 'relu', 'skip_connection', 'neural_network', 'resnet', 'gradient_explosion'],
    },
    {
      heading: `過学習対策：ドロップアウトとバッチ正規化`,
      body: `ディープラーニングはモデルが複雑なため、訓練データへの過学習（暗記）が特に起きやすいです。代表的な対策2つを押さえましょう。

「ドロップアウト」は学習中にランダムでニューロンを一部「無効化」します。特定のニューロンに頼りすぎることなく、他のニューロンも鍛えられるため、汎化性能が上がります。テスト時は全ニューロンを使います（出力を確率分に合わせてスケール調整）。

「バッチ正規化」は各層の出力を正規化（平均0・分散1に揃える）する技術です。層ごとの出力の分布が安定することで学習が速く進み、過学習も抑えられます。現代のネットワークではほぼ標準的に使われています。

その他の対策：
- L1/L2正則化：重みに制約を加えてモデルを単純化
- データ拡張：学習データを水増し（反転・回転・拡大縮小など）
- 早期終了：検証誤差が上がり始めたら学習を止める

G検定ではドロップアウトとバッチ正規化の仕組みと目的が問われます。`,
      termIds: ['dropout', 'batch_normalization', 'overfitting', 'regularization', 'deep_learning', 'neuron', 'data_augmentation', 'normalization'],
    },
    {
      heading: `ハイパーパラメータとはどんな設定か`,
      body: `機械学習のパラメータには2種類あります。「モデルパラメータ」はデータから学習で自動的に決まる重みです。一方「ハイパーパラメータ」は人間が事前に設定する学習の制御値で、データからは自動で決まりません。「設定値」と「学習値」の違いです。

主なハイパーパラメータの例：
- 学習率：勾配降下法で1回に重みをどれだけ動かすか（大きすぎると発散、小さすぎると収束遅い）
- バッチサイズ：1回の学習で使うデータ数（大きいと安定、小さいと汎化が上がりやすい）
- 層の数・各層のニューロン数：ネットワークの「大きさ」を決める
- エポック数：訓練データ全体を何回繰り返すか
- ドロップアウト率：何%のニューロンを無効化するか
- 正則化係数（L1/L2のペナルティの強さ）

良いハイパーパラメータを見つけるには「グリッドサーチ（候補の組み合わせを全部試す）」や「ランダムサーチ」が使われます。グリッドサーチは候補が多いと計算量が爆発的に増えるため、ランダムサーチのほうが効率的な場合があります。最近は AutoML と呼ばれる自動探索ツールも普及しています。

G検定では「ハイパーパラメータはデータから学習されない（人間が設定する）」という点と、具体的なハイパーパラメータの例を問う問題が出ます。モデルパラメータとの違いを明確に理解しておきましょう。`,
      termIds: ['neural_network', 'gradient_descent', 'overfitting', 'hyperparameter', 'dropout', 'batch_size', 'automl', 'epoch', 'regularization', 'learning_rate'],
    },
  ],
  keyTermIds: [
    'neuron',
    'multilayer_perceptron',
    'activation_function',
    'relu',
    'backpropagation',
    'gradient_descent',
    'vanishing_gradient',
    'loss_function',
    'hyperparameter',
    'dnn',
  ],
  keyPoints: [
    'ニューラルネットワークはニューロン（生物の神経細胞の模倣）を層状に接続したモデル',
    '多層パーセプトロン（MLP）は入力層・隠れ層・出力層から構成される全結合ネットワーク',
    '活性化関数（ReLU・シグモイド・tanh）が非線形変換を行い、深いネットワークでの複雑な表現を可能にする',
    '誤差逆伝播法は連鎖律で出力誤差を入力層方向に伝播させ、各重みの勾配を効率的に計算する',
    '勾配降下法（SGD・Adam等）で損失関数を最小化するようにパラメータを更新する',
    '勾配消失問題は深い層で勾配が消えて学習が困難になる現象で、ReLU・バッチ正規化・スキップ結合で対策する',
    'ハイパーパラメータ（学習率・バッチサイズ・層数など）は人間が設定する学習制御パラメータ',
    'ドロップアウトは学習中にランダムにニューロンを無効化して過学習を抑制する正則化手法',
  ],
  exampleQuestionIds: ['ch4-001', 'ch4-005', 'ch4-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 ニューラルネットワーク基礎・活性化関数・誤差逆伝播・勾配降下法',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 勾配消失問題・ReLU・バッチ正規化・過学習対策・ドロップアウト',
  ],
  source_ref_supplements: [
    'https://zero2one.jp/ai-word/backpropagation/',
    'https://atmarkit.itmedia.co.jp/ait/articles/2003/05/news016.html',
    'https://qiita.com/t-tkd3a/items/cce7c46d4e18e72f5fc4',
    'https://ai-kenkyujo.com/deep-learning/batch-normalization/',
    'https://xtrend.nikkei.com/atcl/seminar/19/00005/050900004/',
    'https://note.com/charm_jaguar836/n/n0f11f9f91bbe',
    'https://zenn.dev/tasse/articles/979e391c9c7a89',
    'https://reskilling.com/article/68/',
    'https://qiita.com/Batchi/items/ae070248b4f6ece60fbd',
    'https://www.jdla.org/recommendedbook/',
    'https://saycon.co.jp/whatwedo-2/ai/g/deep-learning-for-general/deep-learning-for-general4',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://note.com/coroeri/n/n9caaab3cf944',
    'https://zero2one.jp/learningblog/neural-network-for-beginners/?srsltid=AfmBOop7adJcNjuBG2lBRDzgKAx64VkObbTmvAEcAZza1T2R45dI_d6F',
    'https://g-ken-master.com/',
    'https://note.com/it_kingkong/n/n424d7a7abbcb',
    'https://qiita.com/mymaicoburi/items/a3f3a857948c906a49e6',
    'https://yusuketakami.com/?p=2157',
    'https://www.jdla.org/certificate/general/start/',
    'https://note.com/yksjps/n/nf6216ae362a2',
    'https://www.crew5.co.jp/success10',
    'https://zenn.dev/breakedge/articles/6fd57d71aace69',
    'https://deepsquare.jp/2024/06/g-exam-2024/',
    'https://www.udemy.com/ja/courses/teaching-and-academics/test-prep/?p=2&srsltid=AfmBOooPTBwuyu69Tcmi9sF6HmG-871BPww_-3jZAltA4gF9sQ9TDlZQ',
    'https://qiita.com/teyosan/items/832737f032803b0958b9',
    'https://note.com/0101_engineer/n/n0f8a05063bf4',
    'https://laws.e-gov.go.jp/law/332M50000800030?occasion_date=20220401',
    'https://qiita.com/Ringa_hyj/items/88691e738bb36bc3dabf',
    'https://g-ken-master.com/exercise/',
    'https://www.jdla.org/certificate/general/',
    'https://gri.jp/media/entry/5259',
    'https://zenn.dev/nekoallergy/articles/ml-basic-act-03',
    'https://www.skillupai.com/blog/certification/about-general/',
    'https://note.com/takonosuke/n/n908b3aa99e3e',
    'https://www.jdla.org/news/20240514001/',
    'http://marupeke296.com/IKDADV_DL_No8_nonlinear.html',
    'https://sakusaku3939.com/blog/activation-function',
    'https://zenn.dev/tasse/articles/2c604e3650fa97',
    'http://tech-nichijo.com/%E3%80%8E%E6%B4%BB%E6%80%A7%E5%8C%96%E9%96%A2%E6%95%B0%E3%80%8F%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E7%90%86%E8%A7%A3%E3%81%99%E3%82%8B/',
    'https://shikaku-expert.com/g-test/books/',
    'https://statisticsschool.com/%E3%80%90python%E3%80%91%E6%B4%BB%E6%80%A7%E5%8C%96%E9%96%A2%E6%95%B0%E3%81%AE%E5%AE%8C%E5%85%A8%E3%82%AC%E3%82%A4%E3%83%89%E7%89%B9%E5%BE%B4%E3%81%A8%E5%8A%B9%E6%9E%9C%E7%9A%84%E3%81%AA%E9%81%B8/',
    'https://www.reddit.com/r/explainlikeimfive/comments/9ycy2a/eli5_why_do_you_need_nonlinear_activation/?tl=ja',
    'https://qiita.com/Soichir0/items/68211a464e975ef4b2e8',
    'https://info.picaca.jp/24050',
    'https://note.com/ohara_designer/n/n0e302360b7bc',
    'https://toukei-lab.com/g_exam',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-comparison/',
    'https://tarepan.hatenablog.com/entry/2015/10/06/183036',
    'https://note.com/gexam_master/n/n19ccd471bec1',
    'https://www.enjoy-tashumi.com/?p=5118',
    'https://statistical.jp/g_examination_4/',
    'https://dassen-ozisan.com/deepgkenteipawapo',
    'https://www.jdla.org/recommendedbook/study/',
    'https://qiita.com/eml_n/items/6391cb9567620852f0ca',
    'https://note.com/gfiddich12years/n/n7c9960d952f2',
    'https://www.tech-teacher.jp/blog/jdla-certificate-study/',
    'https://note.com/gexam_master/n/n53f9df8d5838',
    'https://note.com/ohara_designer/n/n87389c29f83d',
    'https://quizlet.com/jp/704876710/g%E6%A4%9C%E5%AE%9A-%E3%83%87%E3%82%A3%E3%83%BC%E3%83%97%E3%83%A9%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E3%81%AE%E6%A6%82%E8%A6%81-flash-cards/',
    'https://knmts.com/310/',
    'https://zenn.dev/robes/articles/bc184b1f9ed988',
    'https://www.ios-net.co.jp/blog/20250910-5731/',
    'https://listen.style/p/sibucho_labo/qpgjo0kg',
    'https://note.com/eurekachan/n/n7c47b1e37fb2',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://www.agaroot.jp/datascience/column/r06-01/',
    'https://watlab-blog.com/2020/02/01/gexam-deeplearning/',
    'https://www.jdla.org/certificate/general/issues/',
    'https://bizroad-svc.com/blog/deeplearning-gkentei/',
    'https://www.facebook.com/lit.apportal/posts/g%E6%A4%9C%E5%AE%9A%E5%8F%97%E9%A8%93%E7%94%9F%E5%BF%85%E8%A6%8B%E5%A4%B1%E6%95%97%E3%81%97%E3%81%AA%E3%81%84%E7%AC%AC4%E7%AB%A0%E5%88%B0%E9%81%94%E5%BA%A6%E3%83%86%E3%82%B9%E3%83%88%E6%94%BB%E7%95%A5%E3%81%AE%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%82%92%E5%BE%B9%E5%BA%95%E8%A7%A3%E8%AA%AC%E3%83%86%E3%82%B9%E3%83%88%E3%81%A7%E8%BF%B7%E3%82%8F%E3%81%AA%E3%81%84%E3%81%9F%E3%82%81%E3%81%AE%E7%A7%98%E8%A8%A3%E3%81%8C%E3%81%93%E3%81%93%E3%81%AB%E3%81%93%E3%82%8C%E3%81%A7%E5%90%88%E6%A0%BC%E3%81%AB%E4%B8%80%E6%AD%A9%E8%BF%91%E3%81%A5%E3%81%91%E3%82%8B%E3%81%AF%E3%81%9A%E5%8B%89%E5%BC%B7%E4%B8%AD%E3%81%AE%E4%BA%BA%E3%82%82%E3%81%93%E3%82%8C%E3%81%8B%E3%82%89%E5%A7%8B%E3%82%81%E3%82%8B%E4%BA%BA%E3%82%82/1139443731522200/',
    'https://note.com/hotate_nt/n/n323f4b0df55e',
    'https://beginner-ai.com/general/',
    'https://linuxcommand2007.seesaa.net/article/468351730.html',
    'https://knmts.com/309/',
    'https://zenn.dev/tasse/articles/b021f647cd8dc7',
  ],
  relatedChapters: ['ch3', 'ch5'],
};
