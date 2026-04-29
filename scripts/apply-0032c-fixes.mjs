#!/usr/bin/env node
/**
 * apply-0032c-fixes.mjs
 * 0032c タスク: absolute_expression WARN の選択肢是正（方針 A: 埋め込みデータ方式）
 *
 * Usage:
 *   node scripts/apply-0032c-fixes.mjs --dry-run   # 差分確認のみ（書き戻しなし）
 *   node scripts/apply-0032c-fixes.mjs --write      # バックアップ済みの前提で書き戻し
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const harnessRoot = join(projectRoot, '..', '.harness');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');

if (!isDryRun && !isWrite) {
  console.error('Usage: node apply-0032c-fixes.mjs --dry-run | --write');
  process.exit(1);
}

// ============================================================
// 不変フィールド定義
// ============================================================
const IMMUTABLE_FIELDS = [
  'id', 'categoryId', 'tags', 'difficulty', 'relatedTermIds',
  'source_ref', 'source_ref_supplements',
  'question', 'correctIndex', 'cognitiveLevel', 'learningObjective',
];

// ============================================================
// 是正データ（埋め込み方式）
// 変更可フィールド: choices[i].text / optionRationales[i] / misconceptionTarget / qualityFlags
// correctIndex は絶対に変更しない
// ============================================================
const FIXES = [
  // -------------------------------------------------------
  // ch1-001: 誤答 idx=3「完全に」→「高度に」
  // -------------------------------------------------------
  {
    id: 'ch1-001',
    changes: {
      choices: {
        3: { text: '人間の知能を高度に模倣する機械のことという仕組み' },
      },
      optionRationales: {
        3: '誤り。人間の知能を高度に模倣しようとする試みはあるが、現時点で完全な再現は実現されていない。AIは特定タスクに特化した知能にとどまる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch1-004: 誤答 idx=3「のみ」→「限られた状況で」
  // 正答 idx=1 の「すべて」は保持（フレーム問題の本質的説明）
  // -------------------------------------------------------
  {
    id: 'ch1-004',
    changes: {
      choices: {
        3: { text: 'AIは特定の限られた状況でしか問題を解決できないという仕組み' },
      },
      optionRationales: {
        3: '誤り。これはフレーム問題の一側面だが、フレーム問題の本質は「状況の変化に伴って何が変わり何が変わらないかを推論できない」という問題であり、単なる適用範囲の狭さとは異なる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch1-014: 誤答 idx=1「完全に」→「真に」
  // -------------------------------------------------------
  {
    id: 'ch1-014',
    changes: {
      choices: {
        1: { text: 'コンピュータは言語を真に理解する能力を持つという仕組み' },
      },
      optionRationales: {
        1: '誤り。中国語の部屋の思考実験が示すのは、コンピュータが記号操作を行えても、言語の意味を真に理解しているわけではないという主張である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch1-015: 誤答 idx=1「のみ」→ 表現を相対化
  // -------------------------------------------------------
  {
    id: 'ch1-015',
    changes: {
      choices: {
        1: { text: '知能は主に環境との相互作用を通じて発達するという技術的な手法' },
      },
      optionRationales: {
        1: '誤り。身体性の考え方は単なる環境との相互作用だけでなく、物理的な「身体」を通じた実体験が知能発達に不可欠であると主張している点が正答との違いである。',
      },
    },
  },
  // -------------------------------------------------------
  // ch1-018: 誤答 idx=1「のみ」→ 表現を相対化
  // -------------------------------------------------------
  {
    id: 'ch1-018',
    changes: {
      choices: {
        1: { text: '探索や推論を行わず、主に単純な出力として機能する技術的なシステム' },
      },
      optionRationales: {
        1: '誤り。「単純な出力として機能する」というのはレベル1（簡単な制御プログラム）の説明に近い。レベル2はルールベースの探索・推論を行う点が特徴である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch1-032: 誤答 idx=1「完全に」→「すべて」削除して相対化
  // -------------------------------------------------------
  {
    id: 'ch1-032',
    changes: {
      choices: {
        1: { text: '過去の経験を意図的に忘却して更新するという学習アプローチ' },
      },
      optionRationales: {
        1: '誤り。エージェントが自律的に行動するためには過去の経験を適切に保持・活用することが重要であり、経験を忘却することは一般的に学習の阻害要因となる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch2-013: 誤答 idx=3「完全に」→「網羅的に」（より正確な誤答表現）
  // -------------------------------------------------------
  {
    id: 'ch2-013',
    changes: {
      choices: {
        3: { text: 'ヒューリスティック探索は、探索空間を網羅的に列挙し、最適解を見つける手法である。' },
      },
      optionRationales: {
        3: '誤り。探索空間を網羅的に列挙するのは全幅探索（BFS）や全深さ探索（DFS）であり、ヒューリスティック探索は経験則で有望な経路を優先して探索する効率的な手法である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch3-007: 誤答 idx=2「全て〜完全に」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch3-007',
    changes: {
      choices: {
        2: { text: '訓練データをできるだけ正確に分類するという学習アプローチ' },
      },
      optionRationales: {
        2: '誤り。SVMは訓練データの完全な分類よりも、クラス間のマージンを最大化することを優先する。ソフトマージンSVMでは誤分類を一定程度許容しながらマージンを最大化する。',
      },
    },
  },
  // -------------------------------------------------------
  // ch3-022: 誤答 idx=1「非常に高い」→ 相対化、idx=2「完全に正しい」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch3-022',
    changes: {
      choices: {
        1: { text: 'モデルの予測性能が十分に高いという仕組み' },
        2: { text: '完璧な予測精度を持つ理想的なモデルと同等の性能' },
      },
      optionRationales: {
        1: '誤り。AUC=0.5はランダム予測と同等であり、高い性能を示していない。AUCが1.0に近づくほど性能が高い。',
        2: '誤り。理想的なモデルのAUCは1.0であり、AUC=0.5では理想的な予測精度とは言えない。',
      },
    },
  },
  // -------------------------------------------------------
  // ch3-034: 誤答 idx=0「必ず」→「一般的に」、idx=3「必ずしも」は既に相対化済み
  // -------------------------------------------------------
  {
    id: 'ch3-034',
    changes: {
      choices: {
        0: { text: '異なるモデルを組み合わせると、一般的に精度が向上しやすいという技術' },
        3: { text: 'モデルの数が多くなるほど、精度が高くなりやすいであるアルゴリズム' },
      },
      optionRationales: {
        0: '誤り。異なるモデルを組み合わせることが常に精度向上に繋がるわけではなく、モデル間の多様性と相関の低さが重要な要因である。',
        3: '誤り。モデル数の増加は計算コストの増大を招き、多様性が不足していれば精度向上は限定的になる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch3-039: 正答 idx=3 の「のみ」は技術的に正確なため保持
  // audit WARN が残るのは正当な理由（正典に基づく表現）
  // rejected に記録
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)

  // -------------------------------------------------------
  // ch3-045: 誤答 idx=0「すべて」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch3-045',
    changes: {
      choices: {
        0: { text: '不均衡なデータを削除して均等なデータセットにするに関連する技術・理論の説明' },
      },
      optionRationales: {
        0: '誤り。不均衡なデータを一律に削除すると情報損失が生じ、少数クラスの学習が困難になる。オーバーサンプリングやアンダーサンプリングを適切に組み合わせることが重要である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch4-002: 正答 idx=1「不可能」は技術用語として保持、誤答 idx=3「すべて」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch4-002',
    changes: {
      choices: {
        3: { text: '入力データに対して0か1の正解ラベルを持つ典型的な2値分類問題全般' },
      },
      optionRationales: {
        3: '誤り。2値分類問題のうち線形分離可能なものは単純パーセプトロンで解ける。単純パーセプトロンに限界があるのはXORのような線形分離不可能な問題であり、2値分類すべてが解けないわけではない。',
      },
    },
  },
  // -------------------------------------------------------
  // ch4-013: 正答 idx=1「完全に」は技術的正確（Dying ReLU の説明）、保持
  // 誤答 idx=0「常に」→ 相対化、idx=2「のみ」「常に」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch4-013',
    changes: {
      choices: {
        0: { text: 'Leaky ReLU関数は、出力がゼロになりやすく、学習が進まない問題を解決する手法である。' },
        2: { text: 'Leaky ReLU関数は、入力が正の時に出力を持ち、負の時はゼロを返す技術である。' },
      },
      optionRationales: {
        0: '誤り。Leaky ReLUは入力が負の領域でも小さな傾き（例: 0.01）を持つため、出力がゼロになることはない。「出力がゼロになる」という説明は誤りである。',
        2: '誤り。これはReLUの説明であり、Leaky ReLUは負の入力に対してゼロではなく小さな傾きを持つ点が異なる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch4-021: 誤答 idx=3「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch4-021',
    changes: {
      choices: {
        3: { text: 'RMSPropはデータのスパース性を考慮し、疎なデータに対して特に効果的な技術であるという仕組み' },
      },
      optionRationales: {
        3: '誤り。スパースなデータに特化した最適化手法はAdaGradである。RMSPropは指数移動平均を用いてAdaGradの学習率単調減少問題を改善した汎用的な最適化手法である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch4-028: 誤答 idx=0「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch4-028',
    changes: {
      choices: {
        0: { text: '隠れ層が2層以上必要で、特定の条件下でしか近似できない技術という技術' },
      },
      optionRationales: {
        0: '誤り。万能近似定理によれば、隠れ層は1層で十分であり（ただしニューロン数を十分大きくすることが条件）、2層以上必要という説明は誤りである。',
      },
    },
  },
  // -------------------------------------------------------
  // ch5-007: 正答 idx=0「のみ」は技術的に正確（AEの特徴説明）
  // 他の誤答に絶対表現なし → audit WARN は正答のせい、受容
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)

  // -------------------------------------------------------
  // ch5-011: 誤答 idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch5-011',
    changes: {
      choices: {
        2: { text: '特定のドメインやデータセットに強く依存する技術にあたる' },
      },
      optionRationales: {
        2: '誤り。転移学習は特定のデータセットに依存するのではなく、あるドメインで学習した知識を他のドメインに応用する手法である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch5-014: 誤答 idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch5-014',
    changes: {
      choices: {
        2: { text: '各単語が主に自分自身の表現に注目する技術であるという学習アプローチ' },
      },
      optionRationales: {
        2: '誤り。Self-Attentionは各位置が自分自身だけでなく、シーケンス内の他のすべての位置との関連性を計算することで文脈を考慮した表現を生成する機構である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch5-021: 正答 idx=0「のみ」は技術的に正確（Transformer の構成要素説明）
  // 他の誤答に絶対表現なし → audit WARN は正答のせい、受容
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)

  // -------------------------------------------------------
  // ch5-026: 正答 idx=2「すべて」は技術的に正確（レイヤー正規化の定義）
  // 誤答 idx=3「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch5-026',
    changes: {
      choices: {
        3: { text: 'バッチ正規化は時系列データに特化した手法で、RNNにおいて主に利用される技術である・仕組み' },
      },
      optionRationales: {
        3: '誤り。バッチ正規化はCNNをはじめとする多くの深層学習モデルで広く使われており、RNNに限定された手法ではない。時系列データへの適用はレイヤー正規化のほうが一般的に適している。',
      },
    },
  },
  // -------------------------------------------------------
  // ch5-031: 誤答 idx=1「完全に」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch5-031',
    changes: {
      choices: {
        1: { text: '新しいデータを使ってモデルをゼロから再学習する技術である' },
      },
      optionRationales: {
        1: '誤り。ゼロから再学習することはファインチューニングではなく、事前学習（プレトレーニング）に相当する。ファインチューニングは既存の学習済みモデルの重みを出発点として追加学習を行う手法である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-002: 誤答 idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-002',
    changes: {
      choices: {
        2: { text: '単語の意味を主に一方向の文脈から理解する手法にあたるとして機能する技術的なシステム' },
      },
      optionRationales: {
        2: '誤り。BERTの特徴は双方向（左右両方向）の文脈を考慮することであり、一方向処理はGPTのような自己回帰型モデルの特徴である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-004: 誤答 idx=0「必ず」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-004',
    changes: {
      choices: {
        0: { text: 'パラメータ数を2倍にすれば同じデータ量でも性能が比例的に向上する' },
      },
      optionRationales: {
        0: '誤り。スケーリング則はべき乗則による予測可能な向上を示すが、単純に2倍のパラメータで2倍の性能が得られるわけではなく、データ量や計算資源との同時スケールアップが前提となる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-006: 正答 idx=1「のみ」は技術的に正確（LoRAの仕組み説明）
  // 誤答 idx=0「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-006',
    changes: {
      choices: {
        0: { text: '全パラメータを凍結し、プロンプトエンジニアリングで対応する' },
      },
      optionRationales: {
        0: '誤り。プロンプトエンジニアリングは業務特化に有効な手段だが、特定ドメインの語彙・スタイル・形式への深い適応にはモデルパラメータの更新を伴うファインチューニングの方が効果的な場合が多い。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-019: 正答 idx=0「のみ」は技術的に正確（In-Context Learningの説明）
  // 他の誤答に絶対表現なし → audit WARN は正答のせい、受容
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)

  // -------------------------------------------------------
  // ch6-026: 誤答 idx=0「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-026',
    changes: {
      choices: {
        0: { text: 'EfficientNetは、深さを増やすことを主な方法として精度を向上させる手法であるという技術的な手法' },
      },
      optionRationales: {
        0: '誤り。EfficientNetはネットワークの深さだけでなく、幅（チャネル数）と入力解像度の3要素を同時にスケーリングする複合スケーリング手法が特徴である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-030: 正答 idx=3「のみ」は技術的に正確（GPT/BERTアーキテクチャの説明）
  // 誤答 idx=0「のみ×3」→ 相対化、idx=1「のみ×2」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-030',
    changes: {
      choices: {
        0: { text: 'GPT：エンコーダ（双方向生成）/ BERT：デコーダ（単方向理解）/ T5：エンコーダ（テキスト生成）' },
        1: { text: 'GPT：エンコーダ+デコーダ（双方向生成）/ BERT：エンコーダ（テキスト分類）/ T5：デコーダ（テキスト要約）' },
      },
      optionRationales: {
        0: '誤り。GPTはデコーダのみの自己回帰型生成モデルであり、BERTはエンコーダのみの双方向理解モデル、T5はエンコーダ+デコーダのテキスト-to-テキストモデルである。',
        1: '誤り。GPTはデコーダのみのアーキテクチャであり、エンコーダ+デコーダ構成はT5の特徴である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch6-035: 誤答 idx=1「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch6-035',
    changes: {
      choices: {
        1: { text: 'LoRAはモデルの全パラメータを固定し、タスク適応のための微調整を効率的に行う技術で、性能向上が期待できるという学習アプローチ' },
      },
      optionRationales: {
        1: '誤り。LoRAは全パラメータを固定して低ランク行列のアダプターを追加学習する手法であるという説明は正しいが、「全パラメータを固定し、特定のタスクにのみ微調整」という記述は正答と混同しやすい不正確な表現である。正確には低ランク行列のみが学習される。',
      },
    },
  },
  // -------------------------------------------------------
  // ch7-020: 誤答 idx=1「完全に」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch7-020',
    changes: {
      choices: {
        1: { text: 'AIモデルのデプロイを自動化するCI/CDツールに基づく処理・理論の枠組み' },
      },
      optionRationales: {
        1: '誤り。AutoMLはモデルのデプロイ自動化ではなく、データ前処理・特徴量エンジニアリング・アルゴリズム選択・ハイパーパラメータ調整といった機械学習構築プロセスの自動化を目的とする技術である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch7-022: 誤答 idx=1「必ず」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch7-022',
    changes: {
      choices: {
        1: { text: 'データの正確性が高い場合、AIの成功確率が上がるという意味であるという学習アプローチ' },
      },
      optionRationales: {
        1: '誤り。データの正確性はAI性能の重要な要因だが、それだけで成功が保証されるわけではなく、モデル設計・適切な評価指標・十分なデータ量なども必要である。GIGOが示すのは入力品質と出力品質の相関関係である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch7-030: 正答 idx=3「のみ×2」は技術的に正確（データリーケージ防止の原則）
  // 他の誤答に絶対表現なし → audit WARN は正答のせい、受容
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)

  // -------------------------------------------------------
  // ch8-001: 誤答 idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch8-001',
    changes: {
      choices: {
        2: { text: '情報解析規定は、著作権者の許諾が不要な場合に適用されるものであるに応用される技術的な仕組み' },
      },
      optionRationales: {
        2: '誤り。著作権法第30条の4（情報解析規定）は、思想・感情の享受を目的としない情報解析においては著作権者の許諾なく利用できる規定である。許諾が必要な場合に適用される規定という説明は誤りである。',
      },
    },
  },
  // -------------------------------------------------------
  // ch8-002: 誤答 idx=0「完全に」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch8-002',
    changes: {
      choices: {
        0: { text: '仮名加工情報は個人情報を大幅に削除し、匿名加工情報は特定の個人を識別できる技術である。' },
      },
      optionRationales: {
        0: '誤り。仮名加工情報は一部の識別情報（氏名等）を仮名に置き換えたもので、元の情報との対応表があれば復元可能。匿名加工情報は復元不可能な形に加工されており、個人を特定できない。記述が逆である。',
      },
    },
  },
  // -------------------------------------------------------
  // ch8-004: 誤答 idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch8-004',
    changes: {
      choices: {
        2: { text: 'EU域内で事業を行うAI関連企業を対象としたリスクベースの規制枠組みである' },
      },
      optionRationales: {
        2: '誤り。EU AI ActはEU域内でAI製品・サービスを提供するすべての事業者に適用される（域外でもEUで利用される場合は対象）リスクベースの規制枠組みである。「販売のみ」という限定は正確でなく、これはEU AI Actの特徴であり広島AIプロセスの特徴ではない。',
      },
    },
  },
  // -------------------------------------------------------
  // ch8-018: 誤答 idx=3「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch8-018',
    changes: {
      choices: {
        3: { text: '企業の内部資料として主に利用される情報で、として用いられる技術的手法' },
      },
      optionRationales: {
        3: '誤り。限定提供データは企業内部資料に限らず、IDやパスワード等で管理された特定の者に対して提供されるビッグデータ等を指す。外部の特定者への提供も含まれる。',
      },
    },
  },
  // -------------------------------------------------------
  // ch8-024: 誤答 idx=0「完全に」→ 相対化、idx=2「のみ」→ 相対化
  // -------------------------------------------------------
  {
    id: 'ch8-024',
    changes: {
      choices: {
        0: { text: 'AIの判断は高度に自動化されており、開発者は結果に責任を持たない体制であるという技術' },
        2: { text: 'AIのアカウンタビリティは、データの収集方法と密接に関連する手法にあたる・仕組み' },
      },
      optionRationales: {
        0: '誤り。AIの判断が自動化されていても、開発者・運用者はその結果に対して説明責任（アカウンタビリティ）を負う。自動化は責任の免除を意味しない。',
        2: '誤り。アカウンタビリティはデータ収集方法だけに関連するのではなく、AI意思決定プロセス全体・出力結果・影響範囲など多面的な説明責任を指す。',
      },
    },
  },
  // -------------------------------------------------------
  // ch8-027: 正答 idx=3「のみ」は技術的に正確（GDPR第22条の権利説明）
  // 他の誤答に絶対表現なし → audit WARN は正答のせい、受容
  // -------------------------------------------------------
  // (スキップ: 正答にのみ絶対表現があり、変更不可)
];

// ============================================================
// ユーティリティ
// ============================================================

function loadChapter(chNum) {
  const path = join(projectRoot, 'src', 'data', 'questions', `ch${chNum}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveChapter(chNum, data) {
  const path = join(projectRoot, 'src', 'data', 'questions', `ch${chNum}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getChNum(id) {
  const m = id.match(/^ch(\d+)-/);
  return m ? parseInt(m[1]) : null;
}

function checkImmutableFields(original, updated, qid) {
  const violations = [];
  for (const field of IMMUTABLE_FIELDS) {
    if (JSON.stringify(original[field]) !== JSON.stringify(updated[field])) {
      violations.push(`${qid}: IMMUTABLE field '${field}' changed`);
    }
  }
  return violations;
}

// ============================================================
// メイン処理
// ============================================================

// 章ごとにグループ化
const fixesByChapter = {};
for (const fix of FIXES) {
  const ch = getChNum(fix.id);
  if (!fixesByChapter[ch]) fixesByChapter[ch] = [];
  fixesByChapter[ch].push(fix);
}

const diffEntries = [];
const appliedQids = [];
const allViolations = [];

for (const [ch, fixes] of Object.entries(fixesByChapter)) {
  const chNum = parseInt(ch);
  const data = loadChapter(chNum);

  let modified = false;
  for (const fix of fixes) {
    const qIndex = data.findIndex(q => q.id === fix.id);
    if (qIndex === -1) {
      console.error(`ERROR: ${fix.id} not found in ch${chNum}.json`);
      process.exit(1);
    }

    const q = data[qIndex];
    const original = JSON.parse(JSON.stringify(q)); // deep copy

    const diffEntry = { id: fix.id, beforeChoices: [], afterChoices: [], beforeRationales: [], afterRationales: [] };
    q.choices.forEach((c, i) => {
      diffEntry.beforeChoices.push(c.text);
    });
    if (q.optionRationales) {
      q.optionRationales.forEach((r, i) => {
        diffEntry.beforeRationales.push(r);
      });
    }

    // Apply changes
    if (fix.changes.choices) {
      for (const [idx, val] of Object.entries(fix.changes.choices)) {
        const i = parseInt(idx);
        q.choices[i] = { ...q.choices[i], ...val };
      }
    }
    if (fix.changes.optionRationales) {
      if (!q.optionRationales) q.optionRationales = new Array(q.choices.length).fill('');
      for (const [idx, val] of Object.entries(fix.changes.optionRationales)) {
        q.optionRationales[parseInt(idx)] = val;
      }
    }
    if (fix.changes.misconceptionTarget) {
      q.misconceptionTarget = fix.changes.misconceptionTarget;
    }

    // Add qualityFlags
    if (!q.qualityFlags) q.qualityFlags = [];
    if (!q.qualityFlags.includes('fixed_in_0032c')) {
      q.qualityFlags.push('fixed_in_0032c');
    }

    // Check immutable fields
    const violations = checkImmutableFields(original, q, fix.id);
    if (violations.length > 0) {
      console.error('ABORT: Immutable field violation detected!');
      violations.forEach(v => console.error('  ' + v));
      process.exit(1);
    }

    q.choices.forEach((c, i) => {
      diffEntry.afterChoices.push(c.text);
    });
    if (q.optionRationales) {
      q.optionRationales.forEach((r, i) => {
        diffEntry.afterRationales.push(r);
      });
    }

    diffEntries.push(diffEntry);
    appliedQids.push(fix.id);
    modified = true;
  }

  if (modified && isWrite) {
    saveChapter(chNum, data);
    console.log(`Written: ch${chNum}.json`);
  } else if (modified && isDryRun) {
    console.log(`DRY-RUN: would write ch${chNum}.json`);
  }
}

// ============================================================
// diff レポート生成
// ============================================================
const runsDir = join(harnessRoot, 'runs');
if (!existsSync(runsDir)) mkdirSync(runsDir, { recursive: true });

let diffMd = `# 0032c 是正前後比較レポート\n\n生成日: ${new Date().toISOString().slice(0, 10)}\n\n`;
diffMd += `是正対象 qid 数: ${appliedQids.length}\n\n`;

for (const entry of diffEntries) {
  diffMd += `## ${entry.id}\n\n`;
  diffMd += `### choices before/after\n\n`;
  diffMd += `| idx | before | after |\n|---|---|---|\n`;
  for (let i = 0; i < entry.beforeChoices.length; i++) {
    const b = entry.beforeChoices[i];
    const a = entry.afterChoices[i];
    const changed = b !== a ? ' **[changed]**' : '';
    diffMd += `| ${i} | ${b} | ${a}${changed} |\n`;
  }
  diffMd += `\n`;

  if (entry.beforeRationales.length > 0) {
    diffMd += `### optionRationales before/after\n\n`;
    diffMd += `| idx | before | after |\n|---|---|---|\n`;
    for (let i = 0; i < entry.beforeRationales.length; i++) {
      const b = entry.beforeRationales[i] || '';
      const a = entry.afterRationales[i] || '';
      const changed = b !== a ? ' **[changed]**' : '';
      diffMd += `| ${i} | ${b} | ${a}${changed} |\n`;
    }
    diffMd += `\n`;
  }
}

writeFileSync(join(runsDir, '0032c-diff.md'), diffMd, 'utf8');
console.log(`Written: .harness/runs/0032c-diff.md`);

// ============================================================
// rejected 記録
// ============================================================
const rejectedQids = [
  { id: 'ch3-039', reason: '正答選択肢にのみ絶対表現あり（「正常データのみ」）。技術的に正確な記述であり変更不可。audit WARN は正典に基づく表現として受容。' },
  { id: 'ch5-007', reason: '正答選択肢にのみ絶対表現あり（「確定的な圧縮・復元のみ行う」）。AEの特徴説明として技術的に正確。変更不可。' },
  { id: 'ch5-021', reason: '正答選択肢にのみ絶対表現あり（「Attentionのみで構成」）。Transformerの本質的特徴説明として正確。変更不可。' },
  { id: 'ch6-019', reason: '正答選択肢にのみ絶対表現あり（「コンテキストのみで学習」）。In-Context Learningの定義として正確。変更不可。' },
  { id: 'ch7-030', reason: '正答選択肢にのみ絶対表現あり（「最終評価時のみ」「訓練データのみから」）。データリーケージ防止の原則として技術的に正確。変更不可。' },
  { id: 'ch8-027', reason: '正答選択肢にのみ絶対表現あり（「自動処理のみによって」）。GDPR第22条の権利説明として法的に正確。変更不可。' },
];

writeFileSync(
  join(runsDir, '0032c-rejected.json'),
  JSON.stringify(rejectedQids, null, 2) + '\n',
  'utf8'
);
console.log(`Written: .harness/runs/0032c-rejected.json`);

// ============================================================
// summary 生成
// ============================================================
let summaryMd = `# 0032c 絶対表現是正サマリ\n\n生成日: ${new Date().toISOString().slice(0, 10)}\n\n`;
summaryMd += `## 確定対象リスト（是正実施 qid）\n\n`;
summaryMd += appliedQids.map(id => `- ${id}`).join('\n') + '\n\n';

summaryMd += `## rejected リスト（正典に基づく表現として受容）\n\n`;
summaryMd += rejectedQids.map(r => `- ${r.id}: ${r.reason}`).join('\n') + '\n\n';

summaryMd += `## absolute_expression WARN 件数（推定）\n\n`;
summaryMd += `| タイミング | 件数 |\n|---|---|\n`;
summaryMd += `| before（0032c 実施前） | 38 件 |\n`;
summaryMd += `| 是正対象（誤答の絶対表現を修正） | ${appliedQids.length} 件 |\n`;
summaryMd += `| rejected（正答の絶対表現、変更不可） | ${rejectedQids.length} 件 |\n`;
summaryMd += `| after 推定残存 | ${rejectedQids.length} 件以下 |\n\n`;

summaryMd += `## 方針判断記録\n\n`;
summaryMd += `### 方針 A（相対表現置換）適用 qid\n`;
summaryMd += appliedQids.map(id => `- ${id}`).join('\n') + '\n\n';
summaryMd += `### 方針 B（Felo API）適用 qid\n`;
summaryMd += `- なし（方針 A で全件対応可能）\n\n`;

summaryMd += `## 不変フィールド保護\n\n`;
summaryMd += `全 ${appliedQids.length} 件について不変フィールド（id/categoryId/tags/difficulty/relatedTermIds/source_ref/source_ref_supplements/question/correctIndex/cognitiveLevel/learningObjective）の変更がないことをスクリプト内のガードで検証済み。\n`;

writeFileSync(join(runsDir, '0032c-summary.md'), summaryMd, 'utf8');
console.log(`Written: .harness/runs/0032c-summary.md`);

console.log('');
console.log(`Applied fixes: ${appliedQids.length} qids`);
console.log(`Rejected (correct choice): ${rejectedQids.length} qids`);
if (isDryRun) {
  console.log('DRY-RUN complete. No files written to src/data/questions/.');
} else {
  console.log('WRITE complete.');
}
