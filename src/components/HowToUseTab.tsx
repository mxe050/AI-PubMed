import type { AppSettings } from "../types";
import { SettingsPanel } from "./SettingsPanel";

interface Props {
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

export function HowToUseTab({ settings, onSettingsChange }: Props) {
  return (
    <div className="how-to-use">
      <header className="how-to-use-header">
        <h2>このアプリの使い方</h2>
        <p className="how-to-use-imperative">
          医療情報は、「ほぼハルシネーションがない」ではダメで、<br />
          ハルシネーションを限りなくゼロに近づける必要があります。ただし、本アプリは正確性を保証せず、PubMedでの書誌確認と人間による原典確認を支援します。
        </p>
        <p className="how-to-use-imperative">
          PubMedに記載してあるから、信頼できる情報とは言えないことを理解し、<br />
          EBMを学びましょう。
        </p>
        <a
          className="youtube-link-btn"
          href="https://www.youtube.com/watch?v=youE7KY09Y4&t=129s"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="youtube-link-btn-icon" aria-hidden="true">▶</span>
          <span>🎬 AI・LLMとEBM実践・システマテックレビュー作成支援・医学情報系について</span>
        </a>
      </header>

      <section className="how-to-quick-start" aria-labelledby="quick-start-title">
        <div className="how-to-quick-start-heading">
          <span>まずここから</span>
          <h3 id="quick-start-title">目的を選ぶと、必要な画面へ移動できます</h3>
        </div>
        <div className="how-to-quick-start-grid">
          <a href="#quick_evidence">
            <strong>短時間で調べたい</strong>
            <span>疑問からAI用プロンプトを作る</span>
          </a>
          <a href="#fact_check">
            <strong>AI回答を確かめたい</strong>
            <span>PMID・書誌・主張をPubMedで照合</span>
          </a>
          <a href="#topic_exploration">
            <strong>質問のズレ・検索漏れを探したい</strong>
            <span>支持・反対・限定・本文内証拠を探索</span>
          </a>
          <a href="#systematic_review">
            <strong>SRの検索式を作りたい</strong>
            <span>PICOから適格基準・検索語・検証へ</span>
          </a>
        </div>
      </section>

      <section className="how-to-use-section">
        <h3>30秒で分かるCPG / SR検索</h3>
        <ol>
          <li>システマティックレビュー画面でTOPIC_QUERYを作成します。</li>
          <li>文献タイプ／研究デザインフィルターから「診療ガイドライン」または「SR / メタ解析」を1つ選びます。</li>
          <li>表示された根拠・Methods記載例・参考文献を確認してPubMed検索を実行します。</li>
          <li>既知PMIDがあればCPG集合とSR集合へ分けて回収を確認します。</li>
          <li>CPGは全年代の候補を取得後、発行機関の版・置換・有効性情報を人間が確認します。</li>
        </ol>
        <div className="safety-note" role="note">
          CPG/SR検索に出版年制限はありません。consensus statement等はCPG_FILTERへ含めません。focused updateは基礎ガイドラインを自動的に全面置換せず、状態不明は <code>needs_manual_review</code> とします。
        </div>
      </section>

      <section className="how-to-use-section">
        <h3>このアプリの目的</h3>

        <div className="purpose-statement">
          <p>
            <strong>このアプリは、安易にAIに頼らないためのアプリです。</strong>
          </p>
          <p>
            AIだけで完結させたほうが、はるかに簡単で速いことは事実です。
            しかし、医療においては、AIに頼り切ることが患者の安全に直結する重大な弊害を招く可能性があります。
            本アプリは、<strong>AIの簡単・便利さを損なわない</strong>まま、
            <strong>「あえて確認する」「あえて検索する」</strong>という医療者の覚悟を支えるためのワークフローを提供します。
          </p>
          <p className="purpose-quick-tip">
            💡 質問がズレているとハルシネーションが増えるので、
            <strong>「質問ズレ/PubMed検索漏れ」</strong>を利用するとよいでしょう。
            また、ハルシネーション対策は、<strong>● ちょっと調べたい</strong>の
            <strong>「低モデル用ハルシネーション防止プロンプト」</strong>タブに一覧があります。
          </p>
        </div>

        <details className="how-to-collapsible">
          <summary>設計思想とAI依存リスクの背景を読む</summary>
          <div className="how-to-collapsible-body">
        <h4>AIに頼り切ることの弊害（最新研究より）</h4>
        <p className="hint">
          AIへの過度な依存が認知能力や思考プロセスに与える影響について、研究が始まっています。
          結論はまだ確定していませんが、医療者は慎重に向き合うべきです。
          以下の引用は代表的な研究例として示しますが、PMID等の正確な書誌情報は本アプリの「AI出力ファクトチェック」タブで必ず確認してください。
        </p>

        <div className="research-citation">
          <span className="cite-label">研究例 1</span>
          <strong>批判的思考エンゲージメントの低下</strong>
          <br />
          Microsoft Research と Carnegie Mellon University による2025年のCHI論文（Lee et al.）では、生成AIを業務に多用する知識労働者ほど、自己の批判的思考エンゲージメントが低下する傾向が報告されています。AIの回答を検証せず受け入れる姿勢が習慣化すると、判断のメタ認知が薄れる懸念があります。
        </div>

        <div className="research-citation">
          <span className="cite-label">研究例 2</span>
          <strong>AIエッセイ作成時の脳活動の変化</strong>
          <br />
          MITメディアラボのプレプリント（Kosmyna et al., 2025「Your Brain on ChatGPT」）では、ChatGPTを使って繰り返しエッセイを書いた群で、自力で書いた群と比べ脳波（EEG）の活動低下と記憶定着の悪化が示唆されました。長期的な認知への影響は未確定ですが、警鐘として重要な研究です。
        </div>

        <div className="research-citation">
          <span className="cite-label">研究例 3</span>
          <strong>医療系LLMのハルシネーション</strong>
          <br />
          医療領域の大規模言語モデルが、もっともらしい虚偽の引用・PMID・薬剤情報を生成することが多数の論文で報告されています（Goh et al. 2024 ほか）。一見正しそうな出力が、検証せずそのまま臨床判断に使われると、患者安全に致命的な影響を及ぼし得ます。
        </div>

        <div className="medical-imperative">
          <h4>医療者として求められること</h4>
          <ul>
            <li>
              <strong>患者の安全に関わる判断は、人間が責任を負う</strong>
              ：AIは便利な助手であって、最終判断者ではありません。
            </li>
            <li>
              <strong>引用論文・ガイドラインは原典で確認する</strong>
              ：PMID・DOI・URLが実在するか、内容が一致するかを必ず照合する。
            </li>
            <li>
              <strong>「もっともらしい嘘」に騙されない</strong>
              ：AIは自信満々に存在しない論文を引用します。確認は義務です。
            </li>
            <li>
              <strong>検索プロセスを記録し再現可能にする</strong>
              ：検索式・検索日・取得文献を残し、後から再現できる形にする。
            </li>
            <li>
              <strong>誤情報・嘘の記事に惑わされない</strong>
              ：医療情報は患者の生命に直結します。一次情報源（PubMed・Cochrane・公式ガイドライン）に必ず当たる。
            </li>
          </ul>
        </div>

        <h4>本アプリの設計思想</h4>
        <p>
          本アプリは、医学文献検索において、AIの知的支援を活用しつつ、
          最終的にはPubMedで確認可能な文献・検索式に到達するための支援ツールです。
        </p>
        <p>
          AIへのプロンプトを生成する役割をアプリが担い、AIへの問い合わせはユーザーが手動で外部AIサービス（ChatGPT、Claude、Geminiなど）に貼り付けて行います。
          AIから返ってきた検索式や引用文献は、PubMed公式APIで実在確認・抄録取得を行うことでハルシネーションを検出します。
        </p>

        <div className="purpose-statement">
          <p>
            <strong>AIだけでやった方が、もちろんめちゃくちゃ簡単です。</strong>
            それをあえてやらない<strong>根性</strong>、
            あえて確認する<strong>覚悟</strong>こそが、医療者には求められます。
          </p>
          <p>
            このアプリは、AIに頼り切ることなく、AIの簡単・便利さも損なわず、
            その間で「人間が問いを保ち、AIで支援を受け、PubMedで実在確認する」ワークフローを提供します。
            AIに頼り切らず、AIを<strong>「使い倒す」</strong>スタンスです。
          </p>
        </div>
          </div>
        </details>
      </section>

      {/* コラム：OpenEvidence について */}
      <section className="how-to-use-section open-evidence-column">
        <h3>📖 コラム：OpenEvidence について</h3>
        <details className="how-to-collapsible">
          <summary>批判的検討と参考資料を読む</summary>
          <div className="how-to-collapsible-body">
        <p>
          近年、医療情報の世界で <strong>OpenEvidence（オープンエビデンス）</strong>
          が急速に浸透しています。NEJM・JAMA 本文の直接引用、ハルシネーションの少なさ、回答速度といった点で従来の生成AIに対する明確な優位性があり、米国医師の <strong>40% 超</strong>が日常的に使用するとされます。一方で、参照データベースが限られること、情報の最新性、利益相反の構造など、無視できない論点も指摘されています。本コラムは、批判的検討を含む資料を整理したものです。
        </p>

        <h4>最も網羅的な批判的検討（日本語）</h4>
        <div className="open-evidence-source">
          <p>
            <strong>ザックス氏（本名・所属不明）「今更ながら、外科医がOpen Evidenceを使ってみた」</strong>
            （note, 2025年）
            <br />
            <a
              href="https://note.com/5392/n/n002267f62ea1"
              target="_blank"
              rel="noreferrer"
            >
              https://note.com/5392/n/n002267f62ea1
            </a>
          </p>
          <p>
            商業的な紹介記事が多い現状に対し、外科医の立場から批判的検討を主眼に書かれた資料です。要点として、
          </p>
          <ol>
            <li>
              USMLE 100% という指標の裏で独立系レビューでは <strong>約15%の確率で不正確な情報が含まれる可能性</strong>があり、テネクテプラーゼをFDA未承認と回答する誤りなど、レビュー記事・総説への参照依存に伴う時滞の問題、
            </li>
            <li>
              日本語入力が内部で英語に変換され再翻訳される<strong>二重翻訳構造</strong>による情報損失、
            </li>
            <li>
              米国法下のサービスで<strong>HIPAA保護対象外、PHI入力禁止</strong>というデータガバナンス上の制約、
            </li>
            <li>
              CPMが汎用プラットフォームの10倍に達する広告収入モデルに内在する<strong>構造的利益相反</strong>、
            </li>
            <li>
              AI生成物自体は査読を経ていないため<strong>引用元としては不適切</strong>、
            </li>
          </ol>
          <p>
            といった論点が挙げられています。結論として、UpToDate や PubMed、ガイドライン原典を置換するものではなく、
            <strong>point-of-care での初期エビデンス探索とガイドライン横断的迅速参照に用途を限定する補完ツール</strong>として位置づけるべき、という主張で、まさに「片手間では」というご指摘と整合します。
          </p>
        </div>

        <h4>戦略的・構造的な分析（英語）</h4>
        <div className="open-evidence-source">
          <p>
            <strong>Robert Wachter “Medicine's AI Knowledge War Heats Up”</strong>（Substack）
            <br />
            <a
              href="https://robertwachter.substack.com/p/medicines-ai-knowledge-war-heats"
              target="_blank"
              rel="noreferrer"
            >
              https://robertwachter.substack.com/p/medicines-ai-knowledge-war-heats
            </a>
          </p>
          <p>
            UCSF 医学部長による分析で、UpToDate Expert AI、OpenEvidence、Epic（Cosmos データベース活用の Art）を「知識ソースの違い」で比較しています。OpenEvidence は世界中の医学文献・学会ガイドラインをスキャンして genAI で回答を生成する一方、UpToDate は <strong>7,500 人超の人間専門家が継続的に編纂したチャプターのみを情報源</strong>とする、という設計思想の違いを論じており、「データベースが限られる」問題を正面から扱っています。Wolters Kluwer 側の CMO が UpToDate の専門家について「エビデンス、実臨床、すべてに無作為化試験があるわけではないという事実、判断力（judgment）の交点を理解している」と語ったくだりは、人間の編集が介在しない AI 回答の限界を示唆する点で印象的です。
          </p>
        </div>

        <h4>学術的検証（英語）</h4>
        <div className="open-evidence-source">
          <p>
            <strong>Mayo Clinic 研究グループによる回答品質検証論文</strong>（PMC12033599）
            <br />
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12033599/"
              target="_blank"
              rel="noreferrer"
            >
              https://pmc.ncbi.nlm.nih.gov/articles/PMC12033599/
            </a>
          </p>
          <p>
            point-of-care の臨床疑問への回答品質を検証した論文。検証の枠組みそのものを把握する上で参照価値があります。
          </p>
          <p>
            <strong>medRxiv “The accuracy and repeatability of OpenEvidence on complex...”</strong>
            <br />
            <a
              href="https://www.medrxiv.org/content/10.64898/2025.11.29.25341091v1.full-text"
              target="_blank"
              rel="noreferrer"
            >
              https://www.medrxiv.org/content/10.64898/2025.11.29.25341091v1.full-text
            </a>
          </p>
          <p>
            複雑な臨床問題に対する正確性と再現性を検証した最近のプレプリント。限界を指摘した別文献（
            <em>Cureus 2025;17(1):e76867 “OpenEvidence: Enhancing medical student clinical rotations with AI but with limitations”</em>
            ― タイトル自体が結論になっています）も引用しています。
          </p>
        </div>

        <h4>現場医師の運用上の声（英語）</h4>
        <div className="open-evidence-source">
          <p>
            <strong>Reddit r/medicine “We are OpenEvidence – Let's talk about AI and LLMs in healthcare”</strong>
            <br />
            <a
              href="https://www.reddit.com/r/medicine/comments/1dehwb3/"
              target="_blank"
              rel="noreferrer"
            >
              https://www.reddit.com/r/medicine/comments/1dehwb3/
            </a>
          </p>
          <p>
            <strong>出版済み医学文献の80%が方法論的に質が低く、15%が出版バイアス、質の高いものはわずか5%</strong>という指摘に対して OpenEvidence 側がどう対応するかという根本的な質問が投げかけられています。同じく r/FamilyMedicine の比較スレッドでは、OpenEvidence はエビデンス更新は速いものの「<strong>検索エンジンとしてのロバストさは劣り、カバーするトピックも少ない</strong>」という現場医師の声が示されています。
          </p>
        </div>

        <div className="open-evidence-summary">
          <h4>総合</h4>
          <p>
            ご指摘の「データベースが限られる」問題は、OpenEvidence の設計思想の根幹にかかわる<strong>構造的論点</strong>として、外科医、学術研究者、UCSF 医学部長、現場医師という独立した複数の立場から共通して指摘されています。なかでもザックス氏の note と Wachter 氏の Substack がこの論点をもっとも体系的に扱っており、コラムの中核資料として有用です。各資料の結論は「
            <strong>OpenEvidence は point-of-care での初期探索に用途を限定し、UpToDate・PubMed・ガイドライン原典と多層的に併用すべき</strong>
            」という方向に収斂しており、片手間で使うことの危うさを補助線として浮かび上がらせています。
          </p>
        </div>
          </div>
        </details>
      </section>

      <section className="how-to-use-section">
        <h3>アプリのタブ構成（全9タブ）</h3>
        <p className="hint">
          目的別に9つのタブを用意しています。最初は「ちょっと調べたい」（手軽）または
          「EBMのための検索」（PICO学習付き）から始めるのがおすすめです。
        </p>

        <details className="how-to-collapsible">
          <summary>9タブの詳しい説明を読む</summary>
          <div className="strategy-cards how-to-collapsible-body">
          <div className="strategy-card">
            <h4>🛠 使い方・設定</h4>
            <p>
              本ページ。アプリの目的・タブの説明・ワークフロー・NCBI APIキー設定。
            </p>
          </div>

          <div className="strategy-card">
            <h4>● AI出力ファクトチェック</h4>
            <p>
              ChatGPT/Claude/Geminiの回答（医学論文の引用入り）を貼り付け、
              <strong>PMID・DOI・URLの実在確認、抄録取得、撤回・正誤表の警告</strong>を一括実行します。
              AIが生成した「もっともらしい嘘」を構造的に検出する要のタブです。
            </p>
          </div>

          <div className="strategy-card">
            <h4>● 質問ズレ/PubMed検索漏れ</h4>
            <p>
              検索方向を大きく変える確認質問を1つ返した後、PubMedの抄録だけでは届きにくい<strong>本文内証拠</strong>
              （Discussion・Methods・Limitations・Table・Figure・参考文献にある批判・比較・改変・限界・代替分類への言及）を持つ論文を意図的に拾い上げるためのプロンプトを生成します。
            </p>
            <p>
              通常検索も支持側へ寄せず、支持・反対・限定・修正を中立に探索します。必要に応じて<strong>反証検索</strong>で反対側をさらに深掘りできます。
            </p>
          </div>

          <div className="strategy-card">
            <h4>● ちょっと調べたい</h4>
            <p>
              臨床現場の素朴な疑問・違和感を、7モードで素早くプロンプト化して外部AIに渡します。
            </p>
            <ul>
              <li><strong>🛡 低モデル用ハルシネーション防止プロンプト</strong></li>
              <li><strong>🔍 ハルシネーションチェックが行いやすい検索</strong></li>
              <li><strong>🌳 系譜</strong></li>
              <li><strong>💥 常識?</strong></li>
              <li><strong>⚖️ 議論</strong></li>
              <li><strong>📋 簡単検索式</strong></li>
              <li><strong>🎯 検索式チェック</strong></li>
            </ul>
          </div>

          <div className="strategy-card">
            <h4>EBMのための検索</h4>
            <p>
              EBM Step 2（情報検索）に特化。
              <strong>PICO自動入力</strong>（AIが提案するPICO案を <code>===PICO_START===</code> 形式でパースして自動セット）、
              <strong>出版年フィルター</strong>（過去1/5/10/20年/2000年以降）、
              <strong>研究デザインフィルター</strong>（Cochrane Handbook 由来）、
              検索結果を<strong>AIで研究デザイン別に分類</strong>して新しいブラウザタブで表示（CSVダウンロード可）。
            </p>
          </div>

          <div className="strategy-card">
            <h4>システマティックレビュー</h4>
            <p>
              PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索。
              AIに<strong>類語を網羅的に提案</strong>させ、
              <strong>P/I/C/O 別のインタラクティブ検索語テーブル</strong>でチェックON/OFF・行追加しながら、
              <strong>リアルタイムにPubMed検索式を組み立て</strong>ます。
              MeSH確認ボタンで各検索語のMeSH用語確認、構造化検索式アコーディオンでCochrane方式の個別コピーも可能。
            </p>
          </div>

          <div className="strategy-card">
            <h4>PubMed Tool</h4>
            <p>
              PubMed の補助ツール群（PMID 一括処理、抄録の一括翻訳プロンプト生成、書誌情報整形など）。
              他タブと組み合わせてSR後のデータ整理に使います。
            </p>
          </div>

          <div className="strategy-card">
            <h4>害の検索</h4>
            <p>
              診療ガイドライン作成における<strong>「害」の検索</strong>に特化。介入種別と目的を選び、具体的な害・対象集団を入力できる<strong>PubMed検索式ビルダー</strong>と、RCTだけでは不十分な理由、Cochrane Handbook / PRISMA Harms / CONSORT Harms / GRADE に基づく方法論をまとめています。薬剤・外科・医療機器の検証研究と、自由診療で「害がありそうなのに見つからない場合」の検討項目も掲載します。
            </p>
          </div>

          <div className="strategy-card">
            <h4>GRADE-ADOLOPMENT解説</h4>
            <p>
              診療ガイドライン作成手法
              <strong>GRADE-ADOLOPMENT（Adoption + Adaptation + de novo Development）</strong>
              の解説ページ。フローチャート・各ステップ・EtD 8基準・参考文献を掲載。
              実際の検索作業は他タブで行います。
            </p>
          </div>
          </div>
        </details>
      </section>

      <section className="how-to-use-section">
        <h3>使えるAIサービスについて</h3>
        <p className="hint">
          本アプリで生成したプロンプトは、以下のAIサービスのいずれかに貼り付けて利用します。
          利用できるモデルや機能は頻繁に変わるため、サービス名よりも「Web検索の有無」「出典表示」「長文処理」を確認してください。
        </p>

        <details className="how-to-collapsible">
          <summary>AIサービスの比較と共通の注意を読む</summary>
          <div className="how-to-collapsible-body">
        <table className="ai-services-table">
          <thead>
            <tr>
              <th>サービス</th>
              <th>無料版</th>
              <th>有料版</th>
              <th>本アプリ用途での所感</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>ChatGPT</strong>
                <br />
                <a
                  href="https://chat.openai.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  chat.openai.com
                </a>
              </td>
              <td>
                利用回数、選べるモデル、Web検索、長文処理にはプランごとの制限があります。
                使用時点の画面で機能を確認してください。
              </td>
              <td>
                上位モデルや追加機能を利用できる場合がありますが、名称・料金・上限は変更されます。
              </td>
              <td>
                PICO分解や文章の構造化に使えます。Web検索の有無を確認し、提示された文献はPubMedと原典で照合します。
              </td>
            </tr>
            <tr>
              <td>
                <strong>Claude</strong>
                <br />
                <a
                  href="https://claude.ai/"
                  target="_blank"
                  rel="noreferrer"
                >
                  claude.ai
                </a>
              </td>
              <td>
                利用回数、長文処理、検索機能などの上限はプランと時期により異なります。
              </td>
              <td>
                上位モデルや長文向け機能を利用できる場合があります。最新の仕様はサービス画面で確認してください。
              </td>
              <td>
                長い資料の整理に使えます。入力上限を超える場合は分割し、引用・数値・結論を原典と照合します。
              </td>
            </tr>
            <tr>
              <td>
                <strong>Gemini</strong>
                <br />
                <a
                  href="https://gemini.google.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  gemini.google.com
                </a>
              </td>
              <td>
                利用できるモデル、検索連携、利用回数はプランと時期により異なります。
              </td>
              <td>
                上位モデル、長文処理、調査機能を利用できる場合があります。実行前に選択中の機能を確認してください。
              </td>
              <td>
                検索連携を使える場合も、出典が質問と一致するか、PubMed収載情報と原典本文で確認します。
              </td>
            </tr>
            <tr>
              <td>
                <strong>その他</strong>
              </td>
              <td colSpan={2}>
                Perplexity、Microsoft Copilot、DeepSeek、Mistral Le Chat等でも、
                長いプロンプトを扱えるサービスであれば利用できます。
              </td>
              <td>
                出典リンクが表示されても正しさは保証されません。書誌・本文・検索日を同じ手順で確認します。
              </td>
            </tr>
          </tbody>
        </table>

        <div className="callout">
          <h4>共通の注意</h4>
          <ul>
            <li>
              <strong>ハルシネーション対策</strong>：いずれのAIも、PMIDや論文タイトルを誤って提示することがあります。本アプリのファクトチェック機能（PMID実在確認＋抄録取得）を必ず利用してください。
              <div className="hallucination-low-model-note">
                ⚠ モデル、検索設定、利用上限によって、出典確認や長文処理が途中で不完全になる場合があります。
              </div>
            </li>
            <li>
              <strong>機密情報</strong>：患者個人情報、機関名で特定できる症例情報などは、AIに貼り付けないでください。
            </li>
            <li>
              <strong>このアプリ自体はAI APIに通信しません</strong>。AI APIキーの入力欄もありません。AI APIを使うと課金されますが、本アプリの利用ではAI APIへの課金は一切発生しません。
            </li>
          </ul>
        </div>
          </div>
        </details>
      </section>

      <section className="how-to-use-section">
        <h3>NCBI APIキーの設定</h3>
        <p className="hint">
          以下からPubMed APIキー（NCBI APIキー）を設定できます。
          APIキーは<strong>無料・任意</strong>で、入力しなくても本アプリは利用できます。
          AIサービスのAPIキーとは別物です。
        </p>
        <SettingsPanel
          initialSettings={settings}
          onChange={onSettingsChange}
        />
      </section>
    </div>
  );
}
