interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function AiResponseInput({ value, onChange }: Props) {
  return (
    <div className="ai-response-input">
      <h3>AI回答の貼り付け</h3>
      <p className="hint">
        外部AI（ChatGPT / Claude / Geminiなど）からの回答をここに貼り付けてください。
        検索式が含まれていれば、下の検索式欄に抽出できます。
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder="AIの回答をここに貼り付け..."
      />
    </div>
  );
}
