import type { LearnChapter } from '../../types/learn';

export const learnCh5: LearnChapter = {
  categoryId: 'ch5',
  title: 'ディープラーニングの要素技術',
  overview:
    'ディープラーニングの要素技術として、画像処理に特化したCNN（畳み込みニューラルネットワーク）、時系列・シーケンスデータを処理するRNN・LSTM・GRU、そして現代の生成AIの基盤となるTransformerが代表的なアーキテクチャである。CNNは畳み込み層で局所的特徴を抽出しプーリング層で空間サイズを圧縮する。RNNは再帰的構造で時系列情報を保持するが長期依存が困難で、LSTMのゲート機構により大幅に改善された。TransformerはSelf-Attentionにより入力全体の関係を並列計算し、RNNを不要とした革新的アーキテクチャである。実用上の技術として、過学習対策のドロップアウトと学習安定化のバッチ正規化、深いネットワークを可能にするスキップ結合（ResNet）が重要である。また転移学習・ファインチューニングにより少ないデータでも高性能なモデルを構築できる。エッジデバイス展開のためのモデル圧縮（量子化・枝刈り・蒸留）も実務で不可欠な技術である。',
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
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 CNN・RNN・LSTM・GRU・Transformer・Attention機構・Self-Attention',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 ドロップアウト・バッチ正規化・スキップ結合・転移学習・ファインチューニング・モデル圧縮',
  ],
};
