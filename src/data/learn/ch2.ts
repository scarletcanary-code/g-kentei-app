import type { LearnChapter } from '../../types/learn';

export const learnCh2: LearnChapter = {
  categoryId: 'ch2',
  title: 'AI研究の歴史と動向',
  overview:
    'AIの歴史は3度のブームと「AI冬の時代」を繰り返してきた。第1次AIブーム（1950〜60年代）は探索・推論が中心で、チェスや迷路などトイ・プロブレムには対応できたが現実の複雑な問題には限界があった。第2次AIブーム（1980年代）は専門家の知識をIF-THENルールとして組み込むエキスパートシステムが発展したが、常識の組み込みの難しさと知識獲得のボトルネックにより終息した。第3次AIブーム（2010年代〜）はビッグデータとGPUによる計算能力の飛躍的向上を背景に機械学習・ディープラーニングが実用化された。2012年のILSVRCでAlexNetが圧倒的な精度で優勝したことが象徴的な出来事であり、2016年のAlphaGoによる囲碁世界チャンピオン制覇、2022年のChatGPT公開による生成AIの一般普及へと続く。2017年に発表されたTransformerアーキテクチャが現代の大規模言語モデル（LLM）の基盤となっている。',
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
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 3つのAIブーム・エキスパートシステム・探索推論・知識表現',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:6a05d5ec-fce7-4f73-84a9-6100b0374a60 ビッグデータ・GPU・ディープラーニング台頭・AlexNet・ILSVRC',
  ],
};
