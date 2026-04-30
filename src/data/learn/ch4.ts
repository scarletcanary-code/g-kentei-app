import type { LearnChapter } from '../../types/learn';

export const learnCh4: LearnChapter = {
  categoryId: 'ch4',
  title: 'ディープラーニングの概要',
  overview:
    'ディープラーニングは多層のニューラルネットワークを用いて、入力データから特徴量の抽出から予測までをエンドツーエンドで学習する手法である。生物の神経細胞を模倣したニューロンが基本単位であり、複数のニューロンを層状に接続した多層パーセプトロン（MLP）が基本構造となる。各ニューロンは入力の線形結合に活性化関数を適用し非線形変換を行う。代表的な活性化関数にはシグモイド関数・tanh関数・ReLUがあり、現代はReLUが主流である。学習は損失関数を最小化するように誤差逆伝播法と勾配降下法（SGD・Adam等）でパラメータを更新する。深いネットワークで生じる「勾配消失問題」はReLUの使用やバッチ正規化・残差接続（スキップ結合）などで改善される。また過学習の抑制にはドロップアウトや正則化が有効である。これらの基礎技術がCNN・RNN・Transformerなどの発展的なアーキテクチャを支えている。',
  beginnerOverview: `ディープラーニングは、コンピュータがデータから自動的に学習するための方法です。これは、人間の脳の神経細胞を模した「ニューラルネットワーク（神経回路を模したモデル）」を使います。ニューラルネットワークは、たくさんの「ニューロン（神経細胞）」が層になってつながっており、情報を処理します。例えば、画像を認識する場合、コンピュータは写真の中の特徴を学び、何が写っているかを判断します。ディープラーニングでは、誤った予測を減らすために、学習の過程で「誤差（間違い）」を修正していきます。この技術は、顔認証や自動運転車など、私たちの生活の中で多くの場面で使われています。`,
  intermediateOverview: `ディープラーニングは、入力データから特徴量を抽出し、予測を行うための手法であり、多層のニューラルネットワークを用います。基本単位はニューロンで、これは生物の神経細胞を模倣した構造です。多層パーセプトロン（MLP）は、複数のニューロンを層状に接続したもので、各ニューロンは入力の線形結合に活性化関数を適用し、非線形変換を行います。代表的な活性化関数にはシグモイド関数、tanh関数、そして現在主流のReLU（Rectified Linear Unit）があります。

学習プロセスでは、損失関数を最小化することが目指され、誤差逆伝播法と勾配降下法（SGDやAdamなど）を用いてパラメータが更新されます。深いネットワークでは「勾配消失問題」が発生することがありますが、ReLUの使用やバッチ正規化、残差接続（スキップ結合）などの技術によってこの問題は改善されます。また、過学習を防ぐためにはドロップアウトや正則化が効果的です。

これらの基礎技術は、畳み込みニューラルネットワーク（CNN）、再帰型ニューラルネットワーク（RNN）、およびTransformerなどの先進的なアーキテクチャの基盤を形成しています。G検定では、これらの概念や技術の理解が求められ、特に活性化関数や学習手法に関する問題が出題されるため、しっかりとした知識の習得が重要です。`,
  prerequisites: ['ch3'],
  difficulty: 'intermediate',
  sections: [
    {
      heading: 'ニューラルネットワークの基本構造',
      body: 'ディープラーニングの基本単位は「ニューロン（人工神経細胞）」です。生物の脳の神経細胞を模倣し、複数の入力値を重みをかけて合計し、活性化関数を通じて出力を決定します。このニューロンを「入力層→隠れ層（複数）→出力層」の形で多層に積み重ねたものが「ディープニューラルネットワーク（DNN）」です。従来の機械学習では人間が特徴量を手動で設計する必要がありましたが、DNNはデータから特徴量を自動で学習できます。これが画像・音声・テキストなど複雑なデータでも高い性能を発揮できる理由です。入力層は生データを受け取り、隠れ層で段階的に抽象的な特徴を抽出し、出力層で最終的な予測結果を出力します。層を深くするほど複雑なパターンを学習できますが、学習の難しさも増します。',
      beginnerBody: 'ディープラーニングの基本は「ニューロン」と呼ばれる人工の神経細胞です。これは生き物の脳の神経細胞を真似て作られています。ニューロンは、いくつかの入力を受け取り、それに重みをかけて合計し、特定のルールに従って出力を決めます。このニューロンを「入力層」「隠れ層（いくつかの層）」「出力層」という形で重ねたものが「ディープニューラルネットワーク（DNN）」です。従来の機械学習では、人間が特徴を手動で設定する必要がありましたが、DNNはデータから自動で特徴を学ぶことができます。これにより、画像や音声、文章などの複雑なデータでも高い精度で処理できるのです。入力層はデータを受け取り、隠れ層で特徴を抽出し、出力層で結果を出します。層が多いほど複雑なパターンを学べますが、学習が難しくなることもあります。',
      intermediateBody: `ディープラーニングの基本構造は「ニューラルネットワーク」であり、これは生物の神経細胞を模倣したモデルです。基本単位であるニューロンは、複数の入力を受け取り、それに重みをかけて合計し、活性化関数を通じて出力を決定します。このニューロンを層状に配置したものが「多層パーセプトロン（MLP）」であり、入力層、隠れ層、出力層から構成されます。

ディープニューラルネットワーク（DNN）は、隠れ層を複数持つことで、データから特徴を自動的に学習する能力を持っています。従来の機械学習では、特徴量を手動で設計する必要がありましたが、DNNは生データから直接特徴を抽出し、画像や音声、テキストなどの複雑なデータを高精度で処理できます。

学習プロセスでは、損失関数を最小化するために誤差逆伝播法と勾配降下法（SGDやAdamなど）を用いてパラメータを更新します。しかし、層が深くなると「勾配消失問題」が発生しやすくなります。これを解決するために、ReLU活性化関数の使用やバッチ正規化、残差接続（スキップ結合）が効果的です。また、過学習を防ぐためにはドロップアウトや正則化手法が有効です。これらの技術は、CNNやRNN、Transformerなどの高度なアーキテクチャの基盤となっています。`,
      termIds: ['neuron', 'multilayer_perceptron', 'dnn', 'neural_network', 'deep_learning', 'overfitting'],
    },
    {
      heading: '活性化関数：非線形変換がなぜ重要か',
      body: '活性化関数はニューロンの出力に非線形性を加える関数で、ディープラーニングに欠かせない要素です。もし活性化関数がなければ、何層重ねても結局は1つの線形変換と同じになってしまい、複雑なパターンを学習できません。シグモイド関数は出力を0〜1に収める関数ですが、深い層では「勾配消失問題」を引き起こしやすい欠点があります。tanh関数は出力を-1〜1に収め、シグモイドより改善されていますが同様の問題があります。現在主流の「ReLU（ランプ関数）」は入力が正の場合はそのまま出力し、負の場合は0にします。計算がシンプルで勾配消失が起きにくく、深いネットワークでも学習が安定するため、現代のディープラーニングでは標準的な選択肢となっています。',
      beginnerBody: '活性化関数は、ニューラルネットワークの中で重要な役割を果たすもので、ニューロンの出力に「非線形性（ひせんけいせい）」を加えます。これは、単純な計算だけではなく、複雑なパターンを学ぶために必要です。もし活性化関数がなければ、どれだけ層を重ねても、結局は同じような計算になってしまい、学習が進みません。例えば、シグモイド関数は出力を0から1の間に収めますが、深い層では「勾配消失問題（こうばいしょうもんだい）」が起こりやすいです。これに対して、ReLU（ランプ関数）は、正の入力はそのまま出力し、負の入力は0にするため、計算が簡単で、学習が安定しやすいのです。このため、現在のディープラーニングではReLUがよく使われています。',
      intermediateBody: `活性化関数は、ディープラーニングにおいてニューロンの出力に非線形性を加える重要な要素です。もし活性化関数が存在しなければ、どれだけ層を重ねても、全体としては単一の線形変換に過ぎず、複雑なデータパターンを学習することができません。代表的な活性化関数にはシグモイド関数、tanh関数、ReLU（Rectified Linear Unit）があります。

シグモイド関数は出力を0から1の範囲に収めるため、二値分類に適していますが、深いネットワークでは「勾配消失問題」を引き起こしやすく、学習が困難になります。tanh関数は出力を-1から1に収め、シグモイドよりも勾配消失の影響が軽減されますが、依然として深層学習には限界があります。

現在、最も広く使用されているReLUは、入力が正の場合はそのまま出力し、負の場合は0を出力します。この特性により、計算がシンプルであり、勾配消失問題が発生しにくく、深いネットワークでも安定した学習が可能です。ReLUの導入により、ディープラーニングモデルはより複雑な関数を近似できるようになり、CNNやRNN、Transformerなどの先進的なアーキテクチャの発展を支えています。`,
      termIds: ['activation_function', 'relu', 'vanishing_gradient', 'neural_network', 'deep_learning', 'neuron'],
    },
    {
      heading: '誤差逆伝播法と勾配降下法：学習の仕組み',
      body: 'ニューラルネットワークはどのように学習するのでしょうか。まず「損失関数」で予測値と正解の誤差を計算します。次に「誤差逆伝播法（バックプロパゲーション）」で、この誤差を出力層から入力層へ向かって逆向きに伝播させ、各重みの「勾配（誤差への影響度）」を連鎖律を使って効率的に計算します。そして「勾配降下法」で、勾配の反対方向に重みを少しずつ更新します。この繰り返しにより損失関数が最小になる最適なパラメータを見つけます。勾配降下法にはいくつかのバリアントがあり、ミニバッチを使う「SGD」、モーメンタムを活用する「Adam」などが代表的で、Adamは収束速度が速く現代のディープラーニングで広く使われています。',
      beginnerBody: 'ニューラルネットワークは、データを使って学ぶ仕組みを持っています。まず、モデルが出した予測と実際の正しい答えとの違いを「損失関数」という方法で計算します。この誤差を「誤差逆伝播法（バックプロパゲーション）」という手法で、出力から入力へ逆に伝えていきます。この過程で、各重みがどれだけ誤差に影響を与えているかを計算します。次に「勾配降下法」を使って、計算した影響度の逆方向に重みを少しずつ調整します。この作業を繰り返すことで、誤差を最小にするための最適な重みを見つけます。勾配降下法には、データを小分けにして学ぶ「SGD」や、過去の情報を利用する「Adam」などの方法があり、特にAdamは速く学習できるため、現在の深層学習でよく使われています。',
      intermediateBody: `ディープラーニングにおける学習プロセスは、主に「損失関数」、「誤差逆伝播法（バックプロパゲーション）」、「勾配降下法」の三つの要素から成り立っています。まず、モデルが出力した予測値と実際の正解との誤差を「損失関数」を用いて計算します。この誤差は、モデルの性能を評価する指標となります。

次に、誤差逆伝播法を用いて、この誤差を出力層から入力層へ逆向きに伝播させます。この過程では、各層の重みが誤差にどの程度影響を与えているかを計算します。具体的には、連鎖律を利用して、各重みの勾配を効率的に求めます。これにより、どの重みをどれだけ調整すれば誤差が減少するかを把握できます。

最後に、勾配降下法を用いて、計算した勾配の反対方向に重みを少しずつ更新します。これにより、損失関数の値を最小化するための最適なパラメータを見つけることができます。勾配降下法には、全データを一度に使う「バッチ勾配降下法」、データを小分けにして学習する「確率的勾配降下法（SGD）」、および過去の勾配情報を利用する「Adam」などのバリエーションがあります。特にAdamは、収束速度が速く、現在のディープラーニングの実装で広く使用されています。

このように、誤差逆伝播法と勾配降下法は、ディープラーニングモデルが効果的に学習するための基盤を提供しており、これらの技術はCNNやRNN、Transformerなどの高度なアーキテクチャの発展を支えています。`,
      termIds: ['backpropagation', 'gradient_descent', 'loss_function', 'neural_network', 'deep_learning', 'sgd'],
    },
    {
      heading: '過学習対策と深いネットワークを実現する技術',
      body: 'ディープラーニングには2つの重要な実用課題があります。1つ目は「過学習」です。対策として「ドロップアウト」があり、学習時にランダムにニューロンを一定割合で無効化することで、特定のニューロンへの依存を防ぎます。「L2正則化（weight decay）」は重みの大きさにペナルティを加え、シンプルなモデルを維持します。2つ目は「勾配消失問題」です。層が深くなると、誤差逆伝播で勾配が掛け算の連鎖で指数的に小さくなり、浅い層の学習が進まなくなります。「バッチ正規化」は各層の入力をミニバッチ単位で正規化して学習を安定化します。「スキップ結合（残差接続）」はResNetで採用され、入力を数層後に直接加算することで勾配が消えずに届くようにします。',
      beginnerBody: 'ディープラーニングには、2つの大きな問題があります。1つ目は「過学習（かがくしゅう）」です。これは、モデルが訓練データにあまりにも適応しすぎて、新しいデータに対してうまく機能しなくなることを指します。この問題を解決するために「ドロップアウト」という方法があります。これは、学習中にランダムに一部のニューロン（神経細胞）を無効にすることで、特定のニューロンに頼りすぎないようにします。また、「L2正則化（せいそくか）」は、重み（モデルの調整パラメータ）の大きさに制限をかけて、シンプルなモデルを保つ手助けをします。2つ目は「勾配消失問題（こうばいしょうしつもんだい）」です。これは、層が深くなると、誤差を伝える信号が小さくなりすぎて、学習が進まなくなる現象です。この問題を解決するために「バッチ正規化（バッチせいきか）」という手法が使われ、各層の入力を一定の基準に整えることで学習を安定させます。また、「スキップ結合（すきっぷけつごう）」は、入力を数層先に直接送ることで、信号が消えずに届くようにする技術です。',
      intermediateBody: `ディープラーニングにおける重要な課題の一つは「過学習」です。過学習は、モデルが訓練データに過度に適応し、新しいデータに対しての汎用性が低下する現象です。この問題を解決するために「ドロップアウト」という手法が用いられます。ドロップアウトでは、学習中にランダムに一定割合のニューロンを無効化することで、特定のニューロンへの依存を防ぎ、モデルの汎用性を向上させます。また、「L2正則化（weight decay）」も有効で、重みの大きさにペナルティを加えることで、モデルをシンプルに保ち、過学習を抑制します。

もう一つの課題は「勾配消失問題」です。これは、層が深くなるにつれて誤差逆伝播法で伝達される勾配が指数的に小さくなり、浅い層の学習が進まなくなる現象です。この問題を解決するために「バッチ正規化」が利用されます。バッチ正規化は、各層の入力をミニバッチ単位で正規化することで、学習を安定化させ、勾配の流れを改善します。また、「スキップ結合（残差接続）」は、ResNetなどのアーキテクチャで採用されており、入力を数層後に直接加算することで、勾配が消失せずに届くようにします。これにより、より深いネットワークの学習が可能となります。`,
      termIds: ['dropout', 'batch_normalization', 'skip_connection', 'hyperparameter', 'deep_learning', 'overfitting'],
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
