export function GradeExplainerTab() {
  return (
    <div className="grade-explainer">
      <header className="grade-header">
        <h2>GRADE-ADOLOPMENT 解説</h2>
        <p className="grade-subtitle">
          既存ガイドラインの採用（Adoption）・適応（Adaptation）・新規開発（De novo development）を統合した、効率的で信頼性の高い診療ガイドライン作成手法
        </p>
      </header>

      <section className="grade-section">
        <h3>GRADE-ADOLOPMENT とは</h3>
        <p>
          <strong>GRADE-ADOLOPMENT</strong> は、Schünemann ら（2017）が提唱した診療ガイドライン作成のフレームワークです。
          名称は <strong>ADO</strong>ption（採択）+ <strong>ADAP</strong>tation（適応）+
          de novo deve<strong>LOPMENT</strong>（新規開発）の合成語で、
          GRADE Evidence to Decision (EtD) framework を共通基盤として、
          疑問ごとに最適な手段（採択 / 適応 / 新規開発）を選択する手法です。
        </p>
        <p>
          ガイドライン作成は伝統的に「ゼロから作る（de novo）」のが原則とされてきましたが、
          実際には世界中で同じテーマのガイドラインが何度も独立に作られ、
          時間・人的資源・コストが重複して費やされてきました。
          GRADE-ADOLOPMENT は、この重複を避けつつ、各組織の文脈に合った推奨を作るための実装可能な手法として登場しました。
        </p>
        <p>
          Saudi Arabia 保健省の国家ガイドラインプログラムで、22 ガイドライン・226 推奨を約 4〜6 か月で作成した実証研究（Schünemann et al., J Clin Epidemiol 2017;81:101-110）で有効性が示されています。
          通常 1 ガイドラインあたり 2〜3 年かかる作業を大幅に短縮しました。
        </p>

        <div className="callout">
          <h4>本手法の利点（5点）</h4>
          <ul>
            <li>
              <strong>資源効率</strong>：すべてを de novo で作成する場合と比べ、人的・金銭的資源を大幅に削減できる。
              既存の信頼できる SR・GL を起点にすることで、検索・評価・抽出の重複作業を回避。
            </li>
            <li>
              <strong>透明性</strong>：EtD framework により推奨の根拠と判断過程が構造化され、
              「なぜこの推奨になったか」が他者に明示できる。
            </li>
            <li>
              <strong>ローカライズ可能性</strong>：各国・各組織が自分たちの文脈
              （baseline risk、医療体制、患者の価値観、医療資源、文化的受容性）に合わせて推奨を修正できる。
            </li>
            <li>
              <strong>パネル合意形成</strong>：EtD の 8 基準で討議が構造化され、
              「何を判断するのか」がパネルメンバー間で明確になる。
              意見の対立点も基準ごとに分離できるため、合意形成が効率化する。
            </li>
            <li>
              <strong>更新容易性</strong>：原典 GL/SR の更新があった場合、
              EtD のどの基準が変わるかを評価するだけで部分的な更新が可能。
            </li>
          </ul>
        </div>

        <div className="callout">
          <h4>本手法の限界・注意点</h4>
          <ul>
            <li>
              原典 GL に EtD framework が含まれない場合、原典の判断根拠を再構築する必要があり、想定より労力がかかる。
            </li>
            <li>
              原典の信頼性評価（AGREE II 等）が必要で、信頼性が低い原典に依存すると派生 GL の質も低下する。
            </li>
            <li>
              Adoption だけで進めると「単なる翻訳」になりやすく、ローカル文脈での適切性検証が形骸化する危険がある。
            </li>
            <li>
              特に医療資源・薬剤承認状況・保険償還が原典国と大きく異なる場合、
              Adaptation または De novo を選ぶべき場面で誤って Adoption を選んでしまうリスクがある。
            </li>
          </ul>
        </div>

        <h4>3つのアプローチ</h4>
        <div className="approach-grid">
          <div className="approach-box adopted">
            <h5>Adoption（採択）</h5>
            <p>
              既存の信頼できる推奨を、修正なしでそのまま採用する。
              対象集団・介入・比較・エビデンスの確実性は原典と同じ。
              <br />
              <strong>もっとも資源効率の良い方法。</strong>
            </p>
          </div>
          <div className="approach-box adapted">
            <h5>Adaptation（適応）</h5>
            <p>
              既存の推奨を自国・自組織の文脈に合わせて修正する。
              対象・介入・比較・エビデンスの確実性のいずれかが原典と異なる場合がある。
              <br />
              「条件」「モニタリング」「実装」「研究の含意」を追加で示す。
            </p>
          </div>
          <div className="approach-box denovo">
            <h5>De novo development（新規開発）</h5>
            <p>
              既存の信頼できるガイドラインや推奨が存在しない、または利用できない場合に、
              新規にエビデンス統合（SR/HTA等）から推奨を作成する。
              <br />
              <strong>もっとも資源を要する方法。</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="grade-section">
        <h3>フローチャート</h3>
        <p>
          下図はSchünemannら（2017, J Clin Epidemiol 81: 101-110）のFigure 1を日本語化したものです。
        </p>
        <Flowchart />
        <p className="hint">
          原典フローチャートでは、各ステップに番号が付与されています。
          以下に各ステップの詳細を解説します。
        </p>
      </section>

      <section className="grade-section">
        <h3>ステップごとの詳細解説</h3>

        <Step
          number={1}
          title="ガイドライン主題の選定（Select guideline topic）"
          body="ガイドラインで扱う領域・主題を決定します。Saudi Arabia事例では、保健省関係者のニーズ調査に基づき主題を選定しました。利害関係者（臨床家・患者代表・政策決定者）の関与が重要です。"
        />

        <Step
          number={2}
          title="疑問の優先順位付け（Prioritize questions）"
          body="各主題に対し、3〜15個程度の重要臨床疑問（CQ）を選定します。9段階Likert（1=最低、9=最高）の重要度評価をパネル投票で行います。患者視点、介入の利用可能性、法的問題は考慮しますが、資源制約を理由に除外することは避けます。"
        />

        <Step
          number={3}
          title="適切な原典ガイドラインの同定（Identify appropriate source guidelines）"
          body={
            <>
              <p>採択・適応の候補となる原典ガイドラインを探します。原典は以下の条件を満たす必要があります：</p>
              <ul>
                <li><strong>Relevant</strong>：自分たちの疑問に関連する</li>
                <li><strong>Credible（信頼できる）</strong>：方法論的に堅牢</li>
                <li><strong>Relatively recent</strong>：比較的新しい</li>
                <li><strong>Ideally used GRADE approach</strong>：理想的にはGRADE手法を使用している</li>
              </ul>
              <p>
                これらを満たす原典が<strong>見つからない場合</strong>、ADOLOPMENTは適用できず、新規ガイドライン開発（de novo）に移行します。
              </p>
            </>
          }
        />

        <Step
          number={4}
          title="原典推奨と各優先疑問のマッチング（Match source guideline recommendations to each prioritized question）"
          body="ステップ2で選定した各疑問に対し、原典ガイドラインの推奨を対応付けます。一致するものがあれば次のステップへ、なければde novo developmentに進みます。"
        />

        <Step
          number={5}
          title="一致する推奨は存在するか？（Matching recommendation exists?）"
          body={
            <>
              <ul>
                <li><strong>Yes</strong>：ステップ6（既存SRの更新）へ進む</li>
                <li><strong>No</strong>：ステップ14（de novo development）へ進む</li>
              </ul>
            </>
          }
        />

        <Step
          number={6}
          title="必要に応じてSRを更新（Update systematic review as needed）"
          body="原典ガイドラインの根拠となるSRを確認し、最終検索日から3か月以上経過していれば更新検索を行います。原典の検索式を流用し、新しい一次研究を追加します。"
        />

        <Step
          number={7}
          title="原典ガイドラインにEtDが含まれているか？（ETD from source guidelines?）"
          body={
            <>
              <ul>
                <li><strong>Yes</strong>：ステップ9（EtD判断の再評価）へ進む</li>
                <li><strong>No or incomplete</strong>：ステップ8（EtDを新規作成）へ進む</li>
              </ul>
              <p>
                原典にEtDがない、または不完全な場合は、自分たちでEtDを作成する必要があります。
              </p>
            </>
          }
        />

        <Step
          number={8}
          title="EtDを新規作成（Develop ETD）"
          body="原典にEtDがない場合、エビデンス（SR、HTA、抄録、専門家意見）からEtDを構築します。基準は8項目（後述）。"
        />

        <Step
          number={9}
          title="EtD判断を再評価（Reassess ETD judgements）"
          body="原典にEtDがある場合、自国・自組織の文脈で各EtD基準（疾患負担、価値観、エビデンスの確実性、利益と害、資源、公平性、受容性、実行可能性）の判断が変わるかを再評価します。"
        />

        <Step
          number={10}
          title="推奨を作成（Develop recommendation）"
          body="EtD（再評価済みまたは新規）に基づいて、推奨の方向（推奨／非推奨）と強度（強い／条件付き）を決定します。パネルでコンセンサスまたは投票で決定します。"
        />

        <Step
          number={11}
          title="作成した推奨は原典と類似しているか？（&quot;Adoloped&quot; recommendation similar to source?）"
          body={
            <>
              <ul>
                <li><strong>Yes</strong>：ステップ12（採択：Adopted）</li>
                <li><strong>No</strong>：ステップ13（適応：Adapted）</li>
              </ul>
            </>
          }
        />

        <Step
          number={12}
          title="ADOPTED RECOMMENDATION（採択された推奨）"
          body="原典の推奨をそのまま採用。実装情報や採択理由を追記する場合がある。"
          variant="adopted"
        />

        <Step
          number={13}
          title="ADAPTED RECOMMENDATION（適応された推奨）"
          body="原典推奨を文脈に合わせて修正。EtD frameworkで「なぜ判断が異なったか」を透明に記述する。"
          variant="adapted"
        />

        <Step
          number={14}
          title="De novo development（新規開発）"
          body="原典が利用できない場合、新規にSR/HTAを実施し、EtDを構築する。"
        />

        <Step
          number={15}
          title="NEW RECOMMENDATION（新規推奨）"
          body="新規SRに基づいて作成された推奨。3つのうちもっとも資源を要するルート。"
          variant="denovo"
        />
      </section>

      <section className="grade-section">
        <h3>EtD（Evidence to Decision）8基準</h3>
        <p>
          GRADE EtD frameworkでは、推奨の方向と強度に影響する8つの基準を構造的に評価します。
          GRADE-ADOLOPMENTの各ステップ（特にステップ7〜10）の中核となる枠組みです。
        </p>
        <table className="etd-table">
          <thead>
            <tr>
              <th>基準</th>
              <th>内容</th>
              <th>強い推奨に向かいやすい状況</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Problem（問題）</strong></td>
              <td>疾患負担、頻度、有病率、ベースラインリスク、重症度</td>
              <td>問題の重要性が大きい</td>
            </tr>
            <tr>
              <td><strong>Values and preferences（価値観・選好）</strong></td>
              <td>アウトカムの患者にとっての重要性、選好の個人差</td>
              <td>選好のばらつきが小さく重要性が一致</td>
            </tr>
            <tr>
              <td><strong>Certainty in the evidence（エビデンスの確実性）</strong></td>
              <td>GRADEによるエビデンスの確実性評価（高 / 中 / 低 / 非常に低）</td>
              <td>確実性が高いほど</td>
            </tr>
            <tr>
              <td><strong>Benefits and harms（利益と害）</strong></td>
              <td>絶対効果、利益・害のバランス</td>
              <td>正味の利益または害が大きい</td>
            </tr>
            <tr>
              <td><strong>Resource use（資源使用）</strong></td>
              <td>費用、費用対効果、増分利益</td>
              <td>資源効率が明確に有利／不利</td>
            </tr>
            <tr>
              <td><strong>Equity（公平性）</strong></td>
              <td>医療格差の縮小、アクセスの公平性</td>
              <td>不公平を縮小させる可能性が高い</td>
            </tr>
            <tr>
              <td><strong>Acceptability（受容性）</strong></td>
              <td>患者・医療者・政策決定者にとっての受容性</td>
              <td>主要関係者の大多数が受け入れる</td>
            </tr>
            <tr>
              <td><strong>Feasibility（実行可能性）</strong></td>
              <td>実装可能性、医療体制の制約</td>
              <td>実行可能性が高い</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grade-section">
        <h3>具体例</h3>

        <div className="example-box">
          <h4>例1：Adoption（採択）— 透析開始時期</h4>
          <p>
            Saudi Arabia保健省ガイドライン：「成人（18歳以上）でステージ5（GFR≦15
            mL/min/1.73m²）の慢性腎臓病患者では、『早期開始』ではなく『遅延開始』の方針を推奨する（強い推奨、中等度の確実性）」
          </p>
          <p className="hint">
            原典のEtD基準（疾患負担、価値観、利益と害、資源など）の判断が自国の文脈と一致したため、原典推奨をそのまま採用。
          </p>
        </div>

        <div className="example-box">
          <h4>例2：Adaptation（適応）— 乳がんスクリーニング</h4>
          <p>
            原典（カナダTask Force）：「40-50歳女性へのスクリーニングを<strong>推奨しない（弱い推奨）</strong>」
          </p>
          <p>
            Saudi Arabia版（適応後）：「40-50歳女性へのスクリーニングを<strong>条件付きで推奨する</strong>」
          </p>
          <p className="hint">
            理由：自国の若年女性のベースラインリスクが高いと推定されたため、EtDの「Problem」と「Benefits and harms」基準で原典と異なる判断となった。
            EtD frameworkで判断の差を透明に記述。
          </p>
        </div>

        <div className="example-box">
          <h4>例3：De novo development（新規開発）— 多枝病変PCI</h4>
          <p>
            原典（NICE）：エビデンス不足により推奨を保留。
          </p>
          <p>
            Saudi Arabia版（新規開発）：検索更新により試験参加者が約200人（2試験）から約1,000人（4試験）に増加。<br />
            「STEMI＋多枝病変患者では、責任病変のみのPCIよりも<strong>多枝PCIを提案する（条件付き、低い確実性）</strong>」
          </p>
          <p className="hint">
            原典が推奨を出していなかったため、新規にエビデンス統合を実施。ローカルなベースラインリスクと実行可能性も考慮。
          </p>
        </div>
      </section>

      <section className="grade-section">
        <h3>EtD 8 基準の詳細（実例ベース）</h3>
        <p>
          各基準について、具体的な評価方法・データ源・パネル討議でよく出る論点を解説します。
        </p>

        <div className="example-box">
          <h4>1. Problem（問題の重要性）</h4>
          <p>
            <strong>評価項目</strong>：疾患の有病率、罹患率、死亡率、QOL影響、医療資源消費、地域・人口差
          </p>
          <p>
            <strong>データ源</strong>：疫学研究、レジストリ、保険請求データ、Global Burden of Disease (GBD)、地域人口動態統計
          </p>
          <p>
            <strong>判断のポイント</strong>：問題が「個人レベルで重大」「社会レベルで頻度が高い」「医療者間で重要性が共有されている」場合、強い推奨に向かう。
            稀少疾患でも個人への影響が甚大なら問題は大きいと判断する。
          </p>
          <p>
            <strong>パネル討議の典型論点</strong>：地域差・年齢層差をどう扱うか、エビデンスの量と臨床現場の実感の乖離。
          </p>
        </div>

        <div className="example-box">
          <h4>2. Values and preferences（価値観と選好）</h4>
          <p>
            <strong>評価項目</strong>：患者がアウトカムにどう重みを付けるか、選好のばらつき、選好の確実性
          </p>
          <p>
            <strong>データ源</strong>：質的研究、選好調査（discrete choice experiment）、患者代表意見、共有意思決定（SDM）研究
          </p>
          <p>
            <strong>判断のポイント</strong>：選好のばらつきが小さく重要性に合意があれば強い推奨へ。ばらつきが大きい場合は条件付き推奨。
          </p>
          <p>
            <strong>パネル討議の典型論点</strong>：地域・文化的価値観の違い、患者の年齢・健康リテラシーによる差、宗教的・倫理的考慮。
          </p>
        </div>

        <div className="example-box">
          <h4>3. Certainty in the evidence（エビデンスの確実性）</h4>
          <p>
            <strong>評価項目</strong>：GRADE による 4 段階評価（高 / 中 / 低 / 非常に低）。
            出発点は研究デザイン（RCT=高、観察研究=低）。
          </p>
          <p>
            <strong>格下げ要因</strong>：Risk of bias / 非一貫性 (inconsistency) / 非直接性 (indirectness) / 不精確さ (imprecision) / 出版バイアス
          </p>
          <p>
            <strong>格上げ要因</strong>：大きな効果量 / 用量反応関係 / 残余交絡が結果を弱める方向にある
          </p>
          <p>
            <strong>判断のポイント</strong>：確実性が高いほど強い推奨。低・非常に低の場合は条件付きが多い。
          </p>
        </div>

        <div className="example-box">
          <h4>4. Benefits and harms（利益と害）</h4>
          <p>
            <strong>評価項目</strong>：絶対効果（NNT, NNH）、相対リスク、利益と害のバランス、副次アウトカムへの影響
          </p>
          <p>
            <strong>データ源</strong>：SR/MA、ベースラインリスクから絶対効果を計算
          </p>
          <p>
            <strong>判断のポイント</strong>：「正味利益が大きい」または「正味害が大きい」場合は強い推奨。
            「不確実」「微差」「個人差大」の場合は条件付き推奨。
          </p>
          <p>
            <strong>パネル討議の典型論点</strong>：稀な重篤副作用と頻度の高い軽症副作用の重み付け、長期と短期のバランス。
          </p>
        </div>

        <div className="example-box">
          <h4>5. Resource use（資源使用）</h4>
          <p>
            <strong>評価項目</strong>：直接費用、間接費用、医療資源（人員・設備）、費用対効果（ICER）、機会費用
          </p>
          <p>
            <strong>データ源</strong>：経済評価研究、保険償還データ、診療報酬、地域の医療費水準
          </p>
          <p>
            <strong>判断のポイント</strong>：費用対効果が明確に良好なら強い推奨へ。逆に著しく不利なら強い非推奨へ。
          </p>
          <p>
            <strong>地域差の扱い</strong>：所得水準、保険制度、薬価が国により異なるため、Adoption か Adaptation かの判断材料となる。
          </p>
        </div>

        <div className="example-box">
          <h4>6. Equity（公平性）</h4>
          <p>
            <strong>評価項目</strong>：医療アクセスの公平性、社会経済的・人種的・地理的格差への影響
          </p>
          <p>
            <strong>データ源</strong>：地域別実装データ、社会疫学研究、health equity 研究
          </p>
          <p>
            <strong>判断のポイント</strong>：推奨の実装が格差を縮小するか拡大するか。
            縮小なら強い推奨方向、拡大なら慎重な検討が必要。
          </p>
        </div>

        <div className="example-box">
          <h4>7. Acceptability（受容性）</h4>
          <p>
            <strong>評価項目</strong>：患者・医療者・政策決定者にとっての受容性、文化的・倫理的・宗教的適合性
          </p>
          <p>
            <strong>データ源</strong>：質的研究、ステークホルダーインタビュー、現場の医療者調査
          </p>
          <p>
            <strong>判断のポイント</strong>：主要関係者の大多数が受け入れる場合は強い推奨へ。
            重要なステークホルダーが拒否的なら実装が困難になる。
          </p>
        </div>

        <div className="example-box">
          <h4>8. Feasibility（実行可能性）</h4>
          <p>
            <strong>評価項目</strong>：医療体制（人材・設備）、保険制度、規制、トレーニング要件
          </p>
          <p>
            <strong>データ源</strong>：実装研究、医療体制データ、現場医療者ヒアリング
          </p>
          <p>
            <strong>判断のポイント</strong>：技術的・制度的に実装可能なら強い推奨へ。
            「理論上は良いが現場で実装困難」なら条件付き推奨や留保となる。
          </p>
        </div>

        <div className="callout">
          <h4>EtD で「強い推奨」になりやすい組み合わせ</h4>
          <ul>
            <li>問題が重要 + 利益が害を明確に上回る + エビデンスの確実性が高い + 資源効率が良い + 公平性に有利 + 受容性・実行可能性に問題なし</li>
          </ul>
          <h4>EtD で「条件付き推奨」になりやすい組み合わせ</h4>
          <ul>
            <li>エビデンスの確実性が低い、利益と害がほぼ同等、選好のばらつきが大きい、費用対効果が患者・地域により変動、実装に重要な障壁</li>
          </ul>
        </div>
      </section>

      <section className="grade-section">
        <h3>本アプリでGRADE-ADOLOPMENTを支援するには</h3>
        <p>
          本アプリの「トピック探索」「システマティックレビュー」タブで以下のように対応できます：
        </p>
        <ul>
          <li>
            <strong>原典ガイドライン探索（ステップ3）</strong>：「トピック探索」タブで「○○について既存の信頼できるガイドラインを探したい」と入力。AIが既存GLの候補と検索式を提示し、PubMedで実在確認できる。
          </li>
          <li>
            <strong>SR更新（ステップ6）</strong>：「システマティックレビュー」タブで原典SRの最終検索日と検索式をメモに含めて入力。AIがupdate searchを設計。
          </li>
          <li>
            <strong>EtD補助検索（ステップ7-9）</strong>：「トピック探索」タブで個別EtD基準（価値観、資源使用、公平性等）の補助検索を行う。
          </li>
          <li>
            <strong>De novo SR検索（ステップ14）</strong>：「システマティックレビュー」タブで通常のSR検索を実施。
          </li>
        </ul>
      </section>

      <section className="grade-section references">
        <h3>主要参考文献</h3>
        <ol>
          <li>
            Schünemann HJ, Wiercioch W, Brozek J, et al. GRADE Evidence to Decision (EtD) frameworks for adoption, adaptation, and de novo development of trustworthy recommendations: GRADE-ADOLOPMENT.{" "}
            <em>J Clin Epidemiol</em>. 2017;81:101-110.
          </li>
          <li>
            Alonso-Coello P, Schünemann HJ, Moberg J, et al. GRADE Evidence to Decision (EtD) frameworks: a systematic and transparent approach to making well informed healthcare choices. 1: Introduction.{" "}
            <em>BMJ</em>. 2016;353:i2016.
          </li>
          <li>
            Alonso-Coello P, Oxman AD, Moberg J, et al. GRADE Evidence to Decision (EtD) frameworks: a systematic and transparent approach to making well informed healthcare choices. 2: Clinical practice guidelines.{" "}
            <em>BMJ</em>. 2016;353:i2089.
          </li>
          <li>
            Schünemann HJ, Wiercioch W, Etxeandia I, et al. Guidelines 2.0: systematic development of a comprehensive checklist for a successful guideline enterprise.{" "}
            <em>CMAJ</em>. 2014;186(3):E123-E142.
          </li>
        </ol>
      </section>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  body: React.ReactNode;
  variant?: "adopted" | "adapted" | "denovo";
}

function Step({ number, title, body, variant }: StepProps) {
  return (
    <div className={`grade-step ${variant ?? ""}`}>
      <div className="grade-step-number">{number}</div>
      <div className="grade-step-content">
        <h4>{title}</h4>
        {typeof body === "string" ? <p>{body}</p> : body}
      </div>
    </div>
  );
}

function Flowchart() {
  return (
    <div className="grade-flowchart">
      <FlowBox kind="topic" num={1}>
        ガイドライン主題の選定
      </FlowBox>
      <FlowArrow />

      <FlowBox kind="topic" num={2}>
        疑問の優先順位付け
      </FlowBox>
      <FlowArrow />

      <div className="flow-row-with-criteria">
        <FlowBox kind="topic" num={3}>
          適切な原典ガイドラインの同定
        </FlowBox>
        <div className="flow-criteria">
          <ul>
            <li>関連性（Relevant）</li>
            <li>信頼性（Credible）</li>
            <li>比較的新しい（Recent）</li>
            <li>理想的にはGRADE手法</li>
          </ul>
        </div>
      </div>

      <div className="flow-branch">
        <div className="flow-branch-no">
          <div className="flow-branch-label">No</div>
          <FlowBox kind="terminal-na">
            新規ガイドライン開発<br />
            ADOLOPMENT適用外
          </FlowBox>
        </div>
        <div className="flow-branch-yes">
          <div className="flow-branch-label">Yes</div>
          <FlowArrow />
          <FlowBox kind="topic" num={4}>
            各優先疑問に原典推奨を対応付ける
          </FlowBox>
          <FlowArrow />
          <FlowDiamond num={5}>
            一致する推奨が存在するか?
          </FlowDiamond>

          <div className="flow-branch">
            <div className="flow-branch-no">
              <div className="flow-branch-label">No</div>
              <FlowArrow />
              <FlowBox kind="denovo" num={14}>
                De novo development<br />（新規開発）
              </FlowBox>
              <FlowArrow />
              <FlowBox kind="terminal-denovo" num={15}>
                NEW<br />RECOMMENDATION<br />（新規推奨）
              </FlowBox>
            </div>

            <div className="flow-branch-yes">
              <div className="flow-branch-label">Yes</div>
              <FlowArrow />
              <FlowBox kind="topic" num={6}>
                必要に応じてSRを更新
              </FlowBox>
              <FlowArrow />
              <FlowDiamond num={7}>
                原典ガイドラインに<br />EtDが含まれているか?
              </FlowDiamond>

              <div className="flow-branch">
                <div className="flow-branch-no">
                  <div className="flow-branch-label">No / 不完全</div>
                  <FlowArrow />
                  <FlowBox kind="topic" num={8}>
                    EtDを新規作成
                  </FlowBox>
                </div>
                <div className="flow-branch-yes">
                  <div className="flow-branch-label">Yes</div>
                  <FlowArrow />
                  <FlowBox kind="topic" num={9}>
                    EtD判断を再評価
                  </FlowBox>
                </div>
              </div>

              <FlowArrow />
              <FlowBox kind="topic" num={10}>
                推奨を作成
              </FlowBox>
              <FlowArrow />
              <FlowDiamond num={11}>
                作成した推奨は<br />原典と類似しているか?
              </FlowDiamond>

              <div className="flow-branch">
                <div className="flow-branch-no">
                  <div className="flow-branch-label">No</div>
                  <FlowArrow />
                  <FlowBox kind="terminal-adapted" num={13}>
                    ADAPTED<br />RECOMMENDATION<br />（適応された推奨）
                  </FlowBox>
                </div>
                <div className="flow-branch-yes">
                  <div className="flow-branch-label">Yes</div>
                  <FlowArrow />
                  <FlowBox kind="terminal-adopted" num={12}>
                    ADOPTED<br />RECOMMENDATION<br />（採択された推奨）
                  </FlowBox>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FlowBoxProps {
  num?: number;
  children: React.ReactNode;
  kind:
    | "topic"
    | "denovo"
    | "terminal-adopted"
    | "terminal-adapted"
    | "terminal-denovo"
    | "terminal-na";
}

function FlowBox({ num, children, kind }: FlowBoxProps) {
  return (
    <div className={`flow-box flow-box-${kind}`}>
      {num !== undefined && <span className="flow-num">{num}</span>}
      <span className="flow-text">{children}</span>
    </div>
  );
}

function FlowDiamond({
  num,
  children,
}: {
  num: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flow-diamond-wrapper">
      <div className="flow-diamond">
        <span className="flow-num">{num}</span>
        <span className="flow-text">{children}</span>
      </div>
    </div>
  );
}

function FlowArrow() {
  return <div className="flow-arrow" aria-hidden="true">↓</div>;
}
