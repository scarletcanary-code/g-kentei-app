import type { LearnChapter } from '../../types/learn';

export const learnCh8: LearnChapter = {
  categoryId: 'ch8',
  title: 'AI・法律・倫理',
  overview: `AIが社会に広まるほど、「どう使っていいか・いけないか」の議論が重要になります。この章は、技術ではなく法律・倫理・社会的責任を扱います。

個人情報を正しく扱うための「個人情報保護法」、AIがデータを学習するときに著作権はどうなるのかを定める「著作権法」、欧州で世界初の包括的AI規制として注目される「EU AI法」、そして「公平性・透明性・説明責任」というAI倫理の3原則が中心テーマです。法律の条文を丸暗記するよりも「どんな場面で何が問題になるか」をシナリオで理解するほうが試験でも実務でも役立ちます。「AIで人を傷つけない、騙さない、差別しない」という視点を持って学んでいきましょう。G検定では技術的問題だけでなくこうした社会・倫理・法律的課題も出題されます。難しい法律用語も、「なぜこのルールがあるのか」という背景から理解すると記憶に定着しやすくなります。AIを安全・適切に使う社会の一員として必要な知識として取り組みましょう。`,
  prerequisites: [],
  difficulty: 'beginner',
  sections: [
    {
      heading: `個人情報保護法：AI でデータを使う前に知るべきこと`,
      body: `AIシステムは大量のデータを使って学習します。そのデータに「人の情報」が含まれるとき、個人情報保護法（個情法）が関わってきます。

個情法の基本的な分類を覚えましょう。「個人情報」は氏名・生年月日・住所など特定の個人を識別できる情報です。「仮名加工情報」は氏名などを削除して単独では識別できないようにした情報で、一定の制約のもとで社内分析などに使えます。「匿名加工情報」は個人を識別できず復元もできないよう加工した情報で、提供・公表がより自由になります。

AIでデータを使うときに注意すべき点：
- 収集した目的以外にデータを使っていないか（目的外利用の禁止）
- AIへの学習データ投入が「第三者提供」にあたらないか
- 生成AIにデータを入力すると、そのデータが外部サーバーに送られる場合がある

G検定では個人情報・仮名加工情報・匿名加工情報の3種類の違いと、AI活用時の注意点が問われます。`,
      termIds: ['personal_information_protection_act', 'pseudonymized_information', 'anonymized_information'],
    },
    {
      heading: `著作権法とAI学習：日本の独自規定`,
      body: `AIが大量の文章・画像・音楽を学習することは著作権の観点から問題になる可能性があります。ただし日本は2018年の著作権法改正で、他の国には珍しい重要な規定を設けました。

著作権法30条の4（情報解析のための著作物利用）は、機械学習などの情報解析を目的とする場合、著作者の許諾なしに著作物を利用できるとする規定です。これにより日本はAI学習データの収集が他国より法的にしやすい環境になっています。ただし注意点があります。「情報解析を目的としない単なる著作物の複製」はこの規定の対象外です。また学習で生成したデータを他人の著作物そっくりに出力すること（著作権侵害的な生成）は依然として問題になり得ます。さらに「享楽目的での著作物利用（例：AIアートを楽しむため）」も規定の対象外と解釈される場合があります。

生成AIの出力物の著作権については「AIが自動生成しただけでは人間の創作性がない＝著作権は発生しにくい」という考え方が基本です。ただしプロンプトを工夫したり人間が実質的に創作的判断をしている場合は保護される可能性があります。この領域は世界的にも議論が続いており、日本でもガイドラインが随時更新されています。

G検定では著作権法30条の4の内容（情報解析目的なら許諾不要）と、AI生成物の著作権の基本的な考え方が問われます。`,
      termIds: ['copyright_act_30_4', 'privacy'],
    },
    {
      heading: `EU AI法：世界初の包括的 AI 規制`,
      body: `2024年に成立したEU AI法は、AIシステムをリスクに応じて4段階に分類し規制する、世界初の包括的なAI法律です。EU（欧州連合）内で展開するサービスは、EU 域外の日本企業でも対応が必要です。

4段階のリスク分類：
- 許容できないリスク（禁止）：政府による市民の社会信用スコアリング、人々を操作・だます AI など。利用自体が禁止。
- 高リスク：採用選考・教育評価・医療診断・法執行・重要インフラなどで使うAI。厳格な安全管理・透明性・人間による監督が義務付けられる。
- 限定リスク：チャットボットなど。「AI と会話していること」をユーザーに開示する義務など。
- 最小リスク：スパムフィルター・ゲームAIなど。規制は最小限で、自主的なコード・オブ・プラクティスへの参加が推奨される。

また大規模な「汎用目的AI（GPAI）」（GPT-4 などの基盤モデル）には透明性義務や著作権方針の開示が求められます。日本はガイドライン（自主的な指針）が中心で法的強制力が弱い点が EU との大きな違いです。

G検定では4段階のリスク分類の内容と、EU法（法的規制）と日本ガイドライン（自主規制）の違いが問われます。`,
      termIds: ['eu_ai_act', 'ai_governance', 'transparency'],
    },
    {
      heading: `AI倫理の3原則：公平性・透明性・説明責任`,
      body: `AI が社会に与える影響を考えるとき、「技術的にできる」と「倫理的にしてよい」は別の話です。AI倫理の基本として、3つの原則が国際的に広く共有されています。

公平性（Fairness）：AIが特定の人種・性別・年齢・地域などを不当に差別しないこと。学習データにある歴史的な偏りをAIが学んでしまうバイアスに常に注意が必要です。「公平」の定義自体も状況によって異なるため（採用では均等な機会 vs 結果の均等）、どの公平性概念を採用するかを明示することも重要です。

透明性（Transparency）：AIがどう判断したかを説明できること、AIを使っていることを開示すること。ブラックボックスになりやすい深層学習モデルでは特に重要です（XAI と連動）。EU AI法でもリスクの高いAIには透明性の義務が課されます。

説明責任（Accountability）：AIが誤った判断をして誰かが被害を受けたとき、誰が責任を持つか明確にすること。AIは自分で責任を取れないため、開発者・提供者・利用者のそれぞれに役割があります。自動運転車が事故を起こした場合の責任の所在が典型的な議論です。

G検定では3原則（公平性・透明性・説明責任）の名前と意味をセットで問う問題が頻出です。また広島AIプロセス（G7が2023年に立ち上げた国際的なAIガバナンスの枠組み）も押さえておきましょう。`,
      termIds: ['fairness', 'transparency', 'accountability', 'ai_ethics', 'ai_governance'],
    },
    {
      heading: `不正競争防止法・AI事業者ガイドライン・GDPR`,
      body: `AI 活用に関わるその他の重要な法律・ガイドラインを整理します。

不正競争防止法：「営業秘密（秘密管理性・有用性・非公知性の3要件を満たすもの）」や「限定提供データ（特定の相手にのみ提供するデータ）」の不正取得・使用・開示を禁止します。生成AIにビジネスの機密情報を入力すると外部サーバーに送信される場合があり、情報が漏れる可能性があります。「AIに社外秘の情報を入力しない」という社内ルールの根拠となる法律です。

日本AI事業者ガイドライン：内閣府・総務省・経産省が策定した指針で、法的強制力はないが（ソフトロー）、AI開発者・提供者・利用者それぞれの役割と、透明性・安全性・公平性への取り組みを示します。EU AI法のような法律ではなく、事業者の自主的な対応を促す枠組みです。

GDPR（EU一般データ保護規則）：EU市民の個人データを保護する法律で、EU域外の日本企業でもEU向けのサービスを提供する場合は対応が必要です。主な規定：データ収集への明示的同意の取得、忘れられる権利（削除権）、データポータビリティ（データを別の事業者に移す権利）、データ漏洩時の72時間以内の当局への報告義務などです。

G検定では各法律・ガイドラインの目的と適用場面、GDPR の主な権利（削除権・データポータビリティ）が問われます。`,
      termIds: ['unfair_competition_prevention_act', 'ai_operator_guideline', 'privacy'],
    },
  ],
  keyTermIds: [
    'personal_information_protection_act',
    'copyright_act_30_4',
    'eu_ai_act',
    'hiroshima_ai_process',
    'fairness',
    'transparency',
    'accountability',
    'privacy',
    'ai_ethics',
    'ai_governance',
  ],
  keyPoints: [
    '個人情報保護法は個人情報・仮名加工情報・匿名加工情報などの区分を定め、AI活用時の法的枠組みを提供する',
    '著作権法30条の4はAI学習目的での著作物の無許諾利用を認める日本独自の先進的規定（2018年改正）',
    'EU AI法はリスクベースアプローチで4段階分類し、禁止AIや高リスクAIに厳格な義務を課す世界初の包括的AI規制',
    '広島AIプロセスはG7サミット（2023年）で立ち上がり、国際的なAIガバナンス原則の策定・調整を担う',
    'AI倫理の3原則：公平性（Fairness）・透明性（Transparency）・説明責任（Accountability）',
    'ディープフェイクはAIによる偽動画・偽音声の生成技術で、情報操作・詐欺などの悪用が社会問題となっている',
    'GDPRはEUの一般データ保護規則で、個人データ保護の国際基準として日本企業も対応が必要',
    'プライバシーと利便性のトレードオフ・AIバイアスによる差別リスクは継続的なガバナンスが必要な課題',
  ],
  exampleQuestionIds: ['ch8-001', 'ch8-005', 'ch8-010'],
  source_refs: [
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:f82a549c-19b8-4815-b53a-047df3502595 個人情報保護法・要配慮個人情報・著作権法30条の4・EU AI法・広島AIプロセス・AI倫理',
    'notebook:fb01512e-7e46-4df1-bb14-eff57a413bc3 source:8a1f7483-8869-4721-a3cd-6e2c73ec3152 AI倫理原則・公平性・透明性・説明責任・ディープフェイク・GDPR・プライバシー・AI事業者ガイドライン・不正競争防止法',
  ],
  source_ref_supplements: [
    'https://www.ishioroshi.com/biz/kaisetu/fukyouhou/index/gaiyou/',
    'https://biz.moneyforward.com/contract/basic/2884/',
    'https://www.meti.go.jp/policy/economy/chizai/chiteki/',
    'https://xn--alg-li9dki71toh.com/roumu/unfair-competition-prevention-law/',
    'https://zenn.dev/tasse/articles/13f5378a4c59b5',
    'https://www.yuasa-hara.co.jp/lawinfo/5047/',
    'https://note.com/charm_jaguar836/n/nda7fa66ed2d2',
    'https://www.ipsj.or.jp/dp/contents/publication/61/DP61-S04.html',
    'https://patent-revenue.iprich.jp/%E4%B8%80%E8%88%AC%E5%90%91%E3%81%91/4293/',
    'https://zenn.dev/tasse/articles/85fbc399090f9d',
    'https://www.kitahama.or.jp/topics/ai-00004/',
    'https://note.com/miuraandpartners/n/n0949f5f0f022',
    'https://prtimes.jp/main/html/rd/p/000000004.000177225.html',
    'https://storialaw.jp/blog/12050',
    'https://note.com/chosakuken/n/n33e83ffcc04e',
    'https://www.pwc.com/jp/ja/knowledge/column/awareness-cyber-security/generative-ai-regulation07.html',
    'https://www.n-daiichi-law.gr.jp/contents/information/11988',
    'https://note.com/coroeri/n/na19c4868dbc3',
    'https://www.deloitte.com/jp/ja/services/audit-assurance/blogs/ai-governance-07.html',
    'https://www.businesslawyers.jp/articles/1532',
    'https://netshop.impress.co.jp/n/2026/01/23/15474',
    'https://www.brainpad.co.jp/doors/contents/about_ai_act/',
    'https://www.asahi.com/articles/ASV4710KGV47ULFA009M.html',
    'https://qiita.com/tatata55555555/items/1a404fbefced49a5b2b7',
    'https://icsoft.blog/%E8%A6%8F%E5%88%B6%E3%81%AE%E6%B3%A2%E3%81%8C%E6%8A%BC%E3%81%97%E5%AF%84%E3%81%9B%E3%82%8Bai%E2%94%80%E2%94%80%E6%AC%A7%E5%B7%9Eai%E6%B3%95%E3%81%A8%E6%97%A5%E6%9C%AC%E4%BC%81%E6%A5%AD%E3%81%B8/',
    'https://www.businesslawyers.jp/practices/1479',
    'https://www.wiz.io/ja-jp/academy/ai-security/eu-artificial-intelligence-act',
    'https://www.ibm.com/cn-zh/think/topics/eu-ai-act',
    'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
    'https://artificialintelligenceact.eu/',
    'https://www.flowhunt.io/ja/%E3%83%96%E3%83%AD%E3%82%B0/what-practices-are-prohibited-by-the-eu-ai-act/',
    'https://marketing.ipros.jp/contents/knowledge/saas_68/',
    'https://www.pwc.com/jp/ja/knowledge/column/awareness-cyber-security/generative-ai-regulation10.html',
    'https://www.jdla.org/certificate/general/',
    'https://qiita.com/Dataiku/items/1a6e2fcb2d6b43ce50a8',
    'https://techtarget.itmedia.co.jp/tt/news/2603/05/news02.html',
    'https://www.trendmicro.com/zh_hk/what-is/ai/eu-ai-act.html',
    'https://www.sbbit.jp/article/cont1/163222',
    'https://standardful.com/zh-hans/standards/eu-ai-act',
    'https://www.lawyers.org.cn/info/bce1ac77d48641b39f1f188aa0954afc',
    'https://note.com/lighta_ampligh/n/n5b72b333e0f0',
    'https://chk-de.org/zh/eu-law-on-artificial-intelligence-eu-ai-act-overview-and-introduction-to-the-eu-ai-act-guide/',
    'https://cdle.jp/blogs/026960fd5fa6',
    'https://artificialintelligenceact.eu/the-act/',
    'https://www.ushijima-law.gr.jp/topics/20240902eu-ai-act2/',
    'https://zh.wikipedia.org/zh-cn/%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%E6%B3%95%E6%A1%88',
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng',
    'https://note.com/gexam_master/n/n85a329c23f05',
    'https://www.jetro.go.jp/biznews/2025/02/af0786d0eca9e961.html',
    'https://qiita.com/pandausa/items/110171c68e6b2bcc1026',
    'https://www.amazon.co.jp/%E3%83%87%E3%82%A3%E3%83%BC%E3%83%97%E3%83%A9%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0G%E6%A4%9C%E5%AE%9A%EF%BC%88%E3%82%B8%E3%82%A7%E3%83%8D%E3%83%A9%E3%83%AA%E3%82%B9%E3%83%88%EF%BC%89-%E6%B3%95%E5%BE%8B%E3%83%BB%E5%80%AB%E7%90%86%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88-%E5%8F%A4%E5%B7%9D-%E7%9B%B4%E8%A3%95/dp/4297132400',
    'https://zero2one.jp/ai-word/compliance-with-laws/?srsltid=AfmBOookTC9ePqweAThViJP4zgmQ3-na4nuEqPskTf9JCc4qGNzw8OCz',
    'https://note.com/narumi_ai/n/ne244c3abcb34',
    'https://www.jdla.org/certificate/general/issues/',
    'https://note.com/ohara_designer/n/nd4fa39933601',
    'https://zero2one.jp/ai-word/principles-andguidelines-to-depend-on/?srsltid=AfmBOopT3wRQZ52vP7_BW2ETak9kpEUIWL5kfR4dddVBZsNeoa6kOMcW',
    'https://gri.jp/media/entry/8539',
    'https://aismiley.co.jp/ai_news/ai-generalistlicense-deeplearning/',
    'https://urayamaschool.com/aipass/text4.html',
    'https://daily-life-ai.com/3092/',
    'https://www8.cao.go.jp/cstp/ai/ai_guideline/ai_guideline.html',
    'https://www.deloitte.com/jp/ja/services/consulting/perspectives/ai-guideline.html',
    'https://www.ctc-g.co.jp/keys/blog/detail/ai-business-guidelines-key-points',
    'https://laboratory.kiyono-co.jp/2561/ai/',
    'https://note.com/hip_bonobo8548/n/ne00301aaf33c',
    'https://note.com/vast_cosmos500/n/na36a31322ded',
    'https://www.pwc.com/jp/ja/knowledge/column/ai-governance/ai-guideline.html',
    'https://qiita.com/mrmrmr/items/69a945e0f2c218b4959b',
    'https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/20240419_report.html',
    'https://www.cnspat.com/superboard/lib/download.php?wm_table=noticejpn&wm_bid=27&wm_num=0',
    'https://biz.hipro-job.jp/column/corporation/ai_guidelines_for_business/',
    'https://aisi.go.jp/output/output_information/250328_2/',
    'https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/20260331_report.html',
    'https://www.yuasa-hara.co.jp/lawinfo/5336/',
    'https://note.com/gyoza_tencho/n/na25fee7402e7',
    'https://x.com/tka0120/status/1939506459076923566',
    'https://www.reddit.com/r/GeminiAI/comments/1qg89v2/ai_legal_analysis_test_musk_v_openai_grok_41_on/?tl=ja',
    'https://huggingface.co/xyn-ai/anything-v4.0/discussions/2',
    'https://maruyama-mitsuhiko.cocolog-nifty.com/security/2024/04/post-c2c4fb.html',
    'https://zero2one.jp/ai-word/value-principle/?srsltid=AfmBOoqHpPJR7m8xHhl_m-7fYVhYM6SYZ-TH8O45XV9dPH4xx52J36PK',
    'https://chefyushima.com/ai_ethics/2160/',
    'https://pirock-oq.info/post-329/',
    'https://www.agaroot.jp/datascience/column/deep-learning-for-general-difficulty-level/',
    'https://qiita.com/pandausa/items/e4ea1d9c1cb42f75c55b',
    'https://e-words.jp/w/AI%E5%80%AB%E7%90%86%E3%82%A2%E3%82%BB%E3%82%B9%E3%83%A1%E3%83%B3%E3%83%88.html',
    'https://zero2one.jp/ai-word/fat/?srsltid=AfmBOordocP1H0XBlf0svyNTPsgV4cB3TZnDl-zRXPkeTjdX6cEYyVfF',
    'https://daily-life-ai.com/3570/',
    'https://techtarget.itmedia.co.jp/tt/news/2601/15/news04.html',
    'https://zero2one.jp/ai-word/principles-andguidelines-to-depend-on/?srsltid=AfmBOorQE_rmKz0cjkUUihiJSZpjkvzSNwbv8MzFyGUjPWGvu6DTDuNL',
    'https://avilen.co.jp/personal/test/g-certificate/',
    'https://www.kikagaku.co.jp/business/training/blog/g-certificate7',
    'https://note.com/lovely_laelia397/n/n6bf9bca615f7',
    'https://www.jdla.org/document/ai-governance-eco-system/',
    'https://note.com/vast_cosmos500/n/n46800613a1b4',
    'https://shikaku-expert.com/g-test/books/',
    'https://daily-life-ai.com/3528/',
    'https://zero2one.jp/ai-word/deep-fake/?srsltid=AfmBOopw0_0yh63QHmPsdpIhY_SUYX6P-KVx0HsNSqU0AXL3E8xYz9jc',
    'https://note.com/hip_bonobo8548/n/n80843ade85ec',
    'https://note.com/vast_cosmos500/n/nd0afcd965e23',
    'https://note.com/brisk_rabbit6105/n/n4b065d6b7a60',
    'https://blog.trainocate.co.jp/blog/g-ken-sample_009',
    'https://zenn.dev/retrieva_tech/articles/d30fd6300ad2f6',
    'https://www.jdla.org/certificate/generativeai/',
    'https://note.com/gexam_master/n/n19ccd471bec1',
    'https://zenn.dev/breakedge/articles/6fd57d71aace69',
    'https://info.picaca.jp/24050',
    'https://ai-skill-note.com/2026/04/06/g-kentei-guide/',
    'https://toukei-lab.com/g_exam',
    'https://zero2one.jp/ai-word/gdpr/?srsltid=AfmBOoqEOz6G0J76Ggo6JEOP_E21tG8ak1glcUPKuYl1E-cUGQU6VlTI',
    'https://note.com/narumi_ai/n/n867e5015fb9b',
    'https://daily-life-ai.com/3176/',
    'https://boochi-engineer.net/archives/2555',
    'https://zero2one.jp/ai-word/adequacy-decision/?srsltid=AfmBOoqoUq0eP1WBROziHKFZxRvM1KeDvAOMmfGUz0UPKhh8BRsGHOZZ',
    'https://gajumarusdgs.hatenablog.com/entry/2023/04/01/225944',
    'https://law.washu.edu/news/ai-ethics-core-principles-legal-frameworks-and-best-practices/',
    'https://www.td.org/content/atd-blog/7-principles-to-guide-the-ethics-of-artificial-intelligence',
    'https://kpmg.com/jp/ja/insights/2023/06/ai-regulation-explanation-01.html',
    'https://www.intelligence.gov/ai/principles-of-ai-ethics',
    'https://www.prolific.com/resources/what-are-ai-ethics-5-principles-explained',
    'https://qiita.com/tatata55555555/items/77f44471bc8e3cdf90f6',
    'https://dalab.xyz/blog/a-three-layer-model-for-rethinking-ai-ethics/',
    'https://transcend.io/blog/ai-ethics',
    'https://aiskl.jp/ai-ethics-guide/',
    'https://www.nri-secure.co.jp/blog/ai-principle',
    'https://note.com/yoshifuji/n/n0c81a2903198',
    'https://www.ibm.com/think/topics/ai-ethics',
    'https://medium.com/@tahirbalarabe2/what-is-ai-ethics-370c1158fa44',
    'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
    'https://www.dir.co.jp/world/entry/solution/ai-ethics',
    'https://www.digitalcrestinstitute.com/blog/Understanding%20AI%20Ethics%20Principles%20and%20Practices',
    'https://kentei.ai/',
    'https://www.tryeting.jp/column/8039/',
    'https://ainow.ai/2023/05/25/273684/',
    'https://www.genai-career.com/aijissoukentei/',
    'https://www.ai-1956-evolution.com/learning/',
    'https://arpable.com/artificial-intelligence/ai-social-implementation-four-pillars-2025/',
    'https://weblab.t.u-tokyo.ac.jp/lecture/learning-roadmap-job/',
    'https://note.com/maruking777/n/n4a0bd43e441d',
    'https://www.geekly.co.jp/column/cat-position/ai_engineer_certification/',
    'https://jp.linkedin.com/pulse/building-trustworthy-ai-three-layer-approach-ethical-control-john-ho-eaqnc?tl=ja',
    'https://www.ibm.com/jp-ja/think/topics/ai-ethics',
  ],
  relatedChapters: ['ch7'],
};
