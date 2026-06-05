import type { LearnChapter } from '../../types/learn';

export const learnCh5: LearnChapter = {
  categoryId: 'ch5',
  title: 'ディープラーニングの要素技術',
  overview: `ch4 でディープラーニングの「基礎」を学びました。この章では「データの種類ごとに特化した応用技術」を学びます。

画像に強い「CNN（畳み込みニューラルネットワーク）」、文章・音声などの時系列に対応した「RNN」とその改良版「LSTM/GRU」、そして現代のAIの中心「Transformer」の自己注意機構まで、ひとつずつ丁寧に説明します。また、他のタスクで学習したモデルを転用する「転移学習」と「ファインチューニング」、大きなモデルを小さく圧縮する技術についても押さえます。

専門用語が多い章ですが、「このアーキテクチャはどんなデータに向いていて、どんな限界があるのか」というポイントを軸に整理することで、覚えやすくなります。G検定ではそれぞれの特徴と代表的な応用例が頻出です。`,
  prerequisites: ['ch4'],
  difficulty: 'advanced',
  sections: [
    {
      heading: `CNN（畳み込みニューラルネットワーク）と画像認識`,
      body: `画像をそのまま全結合層に入力すると、ピクセル数が多くなるとパラメータが爆発的に増え、近くのピクセルが持つ「空間的なつながり」も活かせません。そこで考案されたのが CNN（畳み込みニューラルネットワーク）です。

CNN の中心は「畳み込み層」。小さなフィルタ（カーネル）を画像の上でスライドさせながら「エッジ」「模様」「色の変化」などの局所的な特徴を抽出します。同じフィルタを画像全体で使い回す（重み共有）ので、パラメータ数を大幅に削減できます。「プーリング層」は画像を縮小して、細かい位置のズレに強くします。浅い層では「線や角」など単純な特徴、深い層では「顔」「車」など抽象的な概念を学びます。

2012年の ILSVRC で CNN ベースの AlexNet が優勝し、画像認識の精度が飛躍的に向上しました。現在では自動運転・医療診断・監視カメラなど幅広く使われています。

G検定では畳み込み・プーリング・重み共有の役割と、CNN が画像に向いている理由を問う問題が頻出です。`,
      termIds: ['cnn', 'convolutional_layer', 'pooling_layer', 'image_recognition', 'neural_network', 'alexnet', 'fully_connected_layer', 'autonomous_driving'],
    },
    {
      heading: `RNN：時系列・文章を扱うための再帰構造`,
      body: `文章や音声のように「順番に意味が変わるデータ」を全結合層で扱うと、前後の文脈が活かせません。そこで登場したのが RNN（再帰的ニューラルネットワーク）です。

RNN は「前の時刻の出力（隠れ状態）を次の時刻の入力に加える」という再帰構造を持ちます。たとえば「私はラーメンが好き」という文を処理するとき、「私は」→「ラーメンが」→「好き」と順番に処理しながら、過去の情報を隠れ状態に蓄積していきます。これにより「文脈を覚えながら読む」ことができます。

ただし RNN には大きな欠点があります。文が長くなると過去の情報が薄れてしまう「勾配消失問題」が起きやすく、文の冒頭の情報が消えてしまいます。また一語ずつ順番に処理するため GPU での並列計算が難しく、長文になるほど処理速度が遅くなります。これらの限界を解決するために LSTM や、後に Transformer が登場しました。

G検定では RNN の構造とこれらの限界（勾配消失・逐次処理）が問われます。RNN→LSTM→Transformer という改善の流れを時系列で把握しておきましょう。`,
      termIds: ['rnn', 'lstm', 'transformer', 'neural_network', 'vanishing_gradient', 'fully_connected_layer', 'gpu'],
    },
    {
      heading: `LSTM と GRU：長期記憶の問題を解決するゲート機構`,
      body: `RNN の「長い文は覚えられない」問題を解決するために生まれたのが LSTM（長短期記憶）です。

LSTM には「セル状態」という長期記憶のための経路があり、3つのゲートで情報の流れを制御します。「入力ゲート」は新しい情報をどれだけ取り込むか、「忘却ゲート」は過去の情報をどれだけ忘れるか、「出力ゲート」は何を次に渡すかを調節します。電車の改札のように、必要な情報だけ通して不要なものを閉じるイメージです。これにより、文の最初に出た「主語」を文末まで記憶しながら処理できます。

GRU（ゲート付き再帰ユニット）は LSTM を簡略化した版で、ゲートを2つに減らしてパラメータ数を削減しています。軽量で同程度の性能が出ることが多く、計算資源が限られる場面で使われます。

G検定では LSTM のゲート（入力・忘却・出力）の役割と、GRU との違いが問われます。ただし現在は Transformer がこの役割の多くを担っています。`,
      termIds: ['lstm', 'gru', 'rnn', 'transformer'],
    },
    {
      heading: `Transformer と自己注意機構：現代 AI の心臓部`,
      body: `2017年に発表された Transformer は、RNN の「逐次処理」という制約を取り除いた革命的なアーキテクチャです。現代の GPT・BERT・ChatGPT はすべてこれを基盤としています。

Transformer の核心は「自己注意機構（Self-Attention）」です。文を処理するとき、各単語が文全体の他の単語との関係を一度に計算します。たとえば「私はラーメンが好き」の「好き」という単語は、「私は」にも「ラーメンが」にも同時に注目できます。RNN のように順番に読む必要がなく、GPU で並列処理できるため、大規模モデルの学習が現実的になりました。

Transformer には「エンコーダ」と「デコーダ」の2種類があります。エンコーダは入力を理解する側（BERT が代表例）で、デコーダは文章を生成する側（GPT が代表例）です。位置の情報は「位置エンコーディング」で別途補います。

G検定では Self-Attention の仕組み、BERT（エンコーダ型）と GPT（デコーダ型）の違い、Transformer が RNN より優れる点が問われます。`,
      termIds: ['transformer', 'self_attention', 'bert', 'gpt', 'positional_encoding', 'chatgpt', 'decoder', 'gpu'],
    },
    {
      heading: `転移学習とファインチューニング：学習済みモデルの再利用`,
      body: `大規模なニューラルネットワークをゼロから学習するには膨大なデータと計算時間が必要です。そこで活用されるのが「転移学習」です。

転移学習とは、ある大きなタスク（例：大量の画像分類）で学習したモデルが獲得した「知識」を、別のタスク（例：医療画像の診断）に転用することです。最初の数層は「線や形を認識する能力」として共通して役立ちます。

転移学習の具体的な方法として「ファインチューニング」があります。事前学習済みのモデルをそのまま使い、新しいタスクのデータで改めて少し学習させる（微調整する）方法です。少ないデータと短い学習時間で高い精度が出るため、実用的な AI 開発では標準的な手法になっています。

さらに、大きなモデルを小さくする「モデル圧縮」技術もあります。不要なパラメータを削る「プルーニング」、数値の精度を落とす「量子化」、大きなモデルの知識を小さなモデルに移す「知識蒸留」などがあります。スマートフォンや組み込み機器でAIを動かすために重要です。

G検定では転移学習・ファインチューニングの意味と、プルーニング・量子化・知識蒸留の概要が問われます。`,
      termIds: ['transfer_learning', 'fine_tuning', 'model_compression', 'pruning', 'quantization', 'knowledge_distillation', 'neural_network'],
    },
    {
      heading: `バッチ正規化・ドロップアウト・スキップ結合の役割`,
      body: `深いネットワークを安定して学習させるための3つの重要技術を整理します。これらは ch4 でも登場しましたが、ch5 の要素技術全体を学んだ今、改めてまとめておきましょう。

「バッチ正規化」は各層の出力を正規化（平均0・分散1に揃える）する技術です。層を通るたびに値の分布が崩れていくと学習が不安定になりますが、この技術で安定化します。学習速度も上がるため、現代のネットワークでは標準的に使われています。

「ドロップアウト」は学習中にランダムでニューロンを無効化する技術です（テスト時は全使用）。特定のニューロンに頼りすぎることなく、ネットワーク全体をバランスよく学習させることで過学習を防ぎます。

「スキップ結合（残差結合）」は、ある層の出力をいくつか飛ばして後の層に足し合わせる構造です。勾配消失を防ぎ、100層を超えるような非常に深いネットワーク（ResNet など）の学習を可能にした技術です。

G検定ではそれぞれの目的（正規化・汎化・深層化）をセットで理解しておくことが大切です。`,
      termIds: ['batch_normalization', 'dropout', 'skip_connection', 'overfitting', 'resnet', 'neuron', 'normalization'],
    },
  ],
  keyTermIds: [
    'cnn',
    'rnn',
    'lstm',
    'transformer',
    'attention_mechanism',
    'dropout',
    'batch_normalization',
    'skip_connection',
    'transfer_learning',
    'fine_tuning',
  ],
  keyPoints: [
    'CNN（畳み込みNN）は畳み込み層で局所特徴を抽出・プーリング層で空間圧縮・全結合層で分類を行う画像処理の基本構造',
    'RNNは再帰的構造で時系列情報を保持するが長期依存が困難。LSTMはゲート機構でこれを解決した',
    'GRUはLSTMを簡略化し、2つのゲートのみで同等性能を実現する軽量な再帰型ネットワーク',
    'Transformerは「Attention Is All You Need」（2017年）で発表され、Self-Attentionで系列全体を並列処理する革新的アーキテクチャ',
    'ドロップアウトは学習時にランダムにニューロンを無効化して過学習を抑制する正則化手法',
    'バッチ正規化は各層の入力をミニバッチ単位で正規化して学習を高速化・安定化する',
    'スキップ結合（残差接続）はResNetで採用され、深いネットワークでの勾配消失問題を解決した',
    '転移学習は大量データで事前学習したモデルを少量データの別タスクに活用する効率的な手法',
  ],
  exampleQuestionIds: ['ch5-001', 'ch5-005', 'ch5-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 CNN・RNN・LSTM・GRU・Transformer・Attention機構・Self-Attention・Q/K/V・Positional Encoding・BPTT',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 ドロップアウト・バッチ正規化・スキップ結合・転移学習・ファインチューニング・モデル圧縮',
  ],
  source_ref_supplements: [
    'https://note.com/gfiddich12years/n/ned8d33e427dc',
    'https://zenn.dev/tasse/articles/7413600fb1796d',
    'https://www.jdla.org/certificate/general/issues/',
    'https://www.jdla.org/certificate/general/start/',
    'https://note.com/charm_jaguar836/n/ne93ce432c186',
    'https://www.jdla.org/recommendedbook/study/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://www.agaroot.jp/datascience/column/gtest-text/',
    'https://python-ai-learn.com/2021/02/22/g-exam4/',
    'https://sikakuma.jp/article/g-kentei-how-to-study',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://qiita.com/Ringa_hyj/items/88691e738bb36bc3dabf',
    'https://www.insource.co.jp/bup/bup_g-test-preparation.html',
    'https://saycon.co.jp/whatwedo-2/ai/g/deep-learning-for-general/deep-learning-for-general5',
    'https://qiita.com/eml_n/items/6391cb9567620852f0ca',
    'https://zenn.dev/tasse/articles/3ec31f79ba65da',
    'https://note.com/coroeri/n/n1d2b4ac1840a',
    'https://note.com/takonosuke/n/n793d0fa8e9fc',
    'https://craftai.jp/ow-to-choose-g-kentei-study-materials/',
    'https://gri.jp/media/entry/37595',
    'https://zero2one.jp/ai-word/convolution/?srsltid=AfmBOopnkfxe5ads2h1K2v6fgBo56a9HuOSBym_ABoIFvsSU5RQbIBUp',
    'https://www.simulationroom999.com/blog/g-test-ultimate-cheat-paper-11-interpretability-xai/',
    'https://ai-shikaku.com/ai/g-kentei/gkentei-deep-learning/',
    'https://knmts.com/309/',
    'https://qiita.com/mrmrmr/items/cab33bbf300c42bf4862',
    'https://zenn.dev/tasse/articles/4200f0f35f498a',
    'https://watlab-blog.com/2020/02/01/gexam-deeplearning/',
    'https://zenn.dev/skakimoto/articles/2025-04-12-books-deeplearning-for-general',
    'https://quizlet.com/jp/514567520/g%E6%A4%9C%E5%AE%9A-flash-cards/',
    'https://ankilot.com/view/?id=7N2PJF3gHo',
    'https://ankimaker.com/workbooks/0a523e9b-df85-4836-afa9-3da07fca4428',
    'https://ankimaker.com/workbooks/63696312-33be-4b98-927f-82c916b7ff3b',
    'https://ankilot.com/view/?id=LOdE8lEZcW',
    'https://note.com/hotate_nt/n/n323f4b0df55e',
    'https://note.com/domonjo01/n/n8a053969f643',
    'https://www.simulationroom999.com/blog/gtest-syllabus-study-time-self-transformer/',
    'https://note.com/kikaben/n/n3e35e496d29c',
    'https://service.ai-prompt.jp/article/ai365-079/',
    'https://tt-tsukumochi.com/archives/8929',
    'https://www.mql5.com/ja/articles/15182',
    'https://qiita.com/mk-mokumoku/items/c74bb651cb63441bc05c',
    'https://developers.agirobots.com/jp/lstmgruentrance-noformula/',
    'https://qiita.com/nakamin/items/e96542d4e69feb56bc73',
    'https://ai-compass.weeybrid.co.jp/algorizm/gru-a-simplified-recurrent-neural-network/',
    'https://ai-library.site/knowledge/rnn-limitations-overcome-the-secret-of-lstm-for-learning-long-term-dependencies/',
    'https://zenn.dev/bit_and_coffee/articles/gk-deep-learning-basics-roadmap',
    'https://reskilling.com/article/68/',
    'https://luca-jiyucho.com/05_deeplearningnoyosogijutsu/',
    'https://note.com/vast_cosmos500/n/n46800613a1b4',
    'https://g-ken-master.com/',
    'https://books.jitsumu.co.jp/',
    'https://tatsu-zine.com/books/pub/impress?srsltid=AfmBOoqwijkmRi9VwVxdHExUMfpeg3zLGT4cGoWZsZPXL1AkGgwpuPr9',
    'https://www.poj.usace.army.mil/Portals/33/docs/BusinessWithUs/Japanese_EM385-1-1_NOV2014.pdf?ver=2018-10-30-035005-127',
    'https://biz.hipro-job.jp/column/corporation/transfer-learning/',
    'https://qiita.com/sirro/items/0ffd558bc4ccf7da43b1',
    'https://ma7viva.com/kentei/general/5-6/',
    'https://note.com/witty_agapan9302/n/n304cfde711e8',
    'https://www.simulationroom999.com/blog/comparison-of-jdla-g-certificate-2021-and-2024-syllabus/3/',
    'https://zenn.dev/tasse/articles/eac2056b0662ff',
    'https://note.com/vast_cosmos500/n/n2a007e757ba3',
    'https://tora3data.com/gkentei/',
    'https://note.com/yksjps/n/nf6216ae362a2',
    'https://qiita.com/syuki-read/items/dba0b61c0443011bab5c',
    'https://www.jdla.org/certificate/general/',
    'https://www.jdla.org/topic/g-interview3/',
    'https://book.impress.co.jp/books/1123101028',
    'https://ai-skill-note.com/2026/04/06/g-kentei-guide/',
    'https://toukei-lab.com/g_exam',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://syp.vn/jp/article/what-is-batch-normalization-in-deep-learning',
    'https://corp.omake.co.jp/%E3%83%90%E3%83%83%E3%83%81%E6%AD%A3%E8%A6%8F%E5%8C%96%E3%81%A8%E3%81%AF%EF%BC%9F%E6%B7%B1%E5%B1%A4%E5%AD%A6%E7%BF%92%E3%81%AE%E6%80%A7%E8%83%BD%E3%82%92%E5%8A%87%E7%9A%84%E3%81%AB%E6%94%B9%E5%96%84/',
    'https://deepage.net/deep_learning/2016/11/30/resnet.html',
    'https://manahatasaas.com/g%E6%A4%9C%E5%AE%9A%E5%AD%A6%E7%BF%92%E8%A8%98%E9%8C%B2%EF%BD%9Cday2%E3%80%8C%E3%83%87%E3%82%A3%E3%83%BC%E3%83%97%E3%83%A9%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E3%81%AE%E8%A6%81%E7%B4%A0%E6%8A%80/',
    'https://zenn.dev/yuto_mo/articles/1f6478e0d7ae1d',
    'https://www.d-m-a.jp/CurriculumEx/course254',
    'https://zenn.dev/xiangze/articles/ec77899b200758',
    'https://data-analytics.fun/2021/11/13/understanding-dropout/',
    'https://www.reddit.com/r/programming/comments/42yq7c/deepmind_go_ai_defeats_european_champion_neural/?tl=ja',
    'https://zenn.dev/breakedge/articles/6fd57d71aace69',
    'https://xtech.nikkei.com/atcl/nxt/mag/rob/18/00007/00027/',
    'https://www.reddit.com/r/chess/comments/1rv86hw/i_trained_a_small_neural_network_to_play_chess_on/?tl=ja',
    'https://tjo.hatenablog.com/entry/2025/02/26/181918',
    'https://coeteco.jp/articles/13146',
    'https://tatsy.github.io/programming-for-beginners/python/gan/',
    'https://saycon.co.jp/archives/neta/%E7%94%BB%E5%83%8F%E8%AA%8D%E8%AD%98%E3%81%AE%E5%B8%B8%E8%AD%98%EF%BC%81%E3%81%AA%E3%81%9Ccnn%E3%81%A7%E3%81%AF%E3%83%89%E3%83%AD%E3%83%83%E3%83%97%E3%82%A2%E3%82%A6%E3%83%88%E3%82%88%E3%82%8A',
    'https://www.jstage.jst.go.jp/article/jjsai/28/4/28_649/_pdf',
    'https://sakai-hiroshi.com/deep-learning-overview9/',
    'https://weblab.t.u-tokyo.ac.jp/lecture/learning-roadmap-job/',
    'https://qiita.com/omiita/items/01855ff13cc6d3720ea4',
    'https://datamix.co.jp/media/datascience/deeplearning-structure/',
    'https://dx-consultant-fast-evolving.com/batch-normalization/',
    'https://note.com/kikaben/n/nb9134ab2d2c3',
    'https://note.com/hotate_nt/n/n0d5d0f4b0148',
  ],
  relatedChapters: ['ch4', 'ch6'],
};
