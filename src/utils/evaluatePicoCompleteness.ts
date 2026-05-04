export interface PicoEvalResult {
  score: number; // 0-4
  missing: string[];
  recommendRefinement: boolean;
}

export function evaluatePicoCompleteness(question: string): PicoEvalResult {
  const missing: string[] = [];
  let score = 0;

  const compactLength = question.replace(/\s/g, "").length;

  // P: 対象患者
  if (
    /[歳|患者|症例|高齢|小児|成人|新生児|乳児|思春期|男性|女性|妊婦|疾患|症候群|障害|病|症|不全|障害|HF|HFrEF|HFpEF|糖尿病|高血圧|脳卒中|心不全|肺炎|癌|がん|腫瘍|うつ|不安]/i.test(
      question
    )
  ) {
    score++;
  } else {
    missing.push("P（対象患者・状況）");
  }

  // I: 介入・曝露
  if (
    /[阻害薬|療法|治療|介入|曝露|投与|薬|手術|薬剤|処置|検査|スクリーニング|予防接種|予防|リハビリ|理学療法|食事療法|運動療法|生活習慣|教育|指導]/i.test(
      question
    )
  ) {
    score++;
  } else {
    missing.push("I（介入・曝露）");
  }

  // O: アウトカム
  if (
    /[死亡|生存|入院|再入院|改善|寛解|発症|発生|減少|増加|有効|奏効|QOL|アウトカム|転帰|予後|合併症|有害|副作用|安全|効果|有用|抑制|促進|低下|上昇|相対|絶対|リスク|発病|罹患]/i.test(
      question
    )
  ) {
    score++;
  } else {
    missing.push("O（アウトカム）");
  }

  // C は緩く扱う（プレーン質問では明示されないことが多い）
  if (
    /[対|比|vs|より|プラセボ|標準治療|無治療|非介入|比較|対照|コントロール]/i.test(
      question
    )
  ) {
    score++;
  }

  const tooShort = compactLength < 30;
  const recommendRefinement = tooShort || score <= 1 || missing.length >= 2;

  return { score, missing, recommendRefinement };
}
