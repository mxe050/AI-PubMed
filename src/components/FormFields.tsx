interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Quick-fill chips that append (or set) the value when clicked. */
  quickFillOptions?: string[];
}

interface Props {
  fields: FieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function FormFields({ fields, values, onChange }: Props) {
  return (
    <div className="form-fields">
      {fields.map((field) => (
        <div className="form-group" key={field.key}>
          <label htmlFor={`field-${field.key}`}>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>

          {field.type === "select" && field.options ? (
            <select
              id={`field-${field.key}`}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="">選択してください</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.multiline ? (
            <>
              {field.quickFillOptions && field.quickFillOptions.length > 0 && (
                <QuickFillChips
                  options={field.quickFillOptions}
                  currentValue={values[field.key] ?? ""}
                  onAppend={(text) => {
                    const cur = values[field.key] ?? "";
                    const next = cur.trim() ? `${cur.trim()} / ${text}` : text;
                    onChange(field.key, next);
                  }}
                  onReplace={(text) => onChange(field.key, text)}
                />
              )}
              <textarea
                id={`field-${field.key}`}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                rows={4}
                placeholder={field.placeholder}
              />
            </>
          ) : (
            <input
              id={`field-${field.key}`}
              type="text"
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function QuickFillChips({
  options,
  currentValue,
  onAppend,
  onReplace,
}: {
  options: string[];
  currentValue: string;
  onAppend: (text: string) => void;
  onReplace: (text: string) => void;
}) {
  return (
    <div className="quick-fill-chips">
      <span className="quick-fill-label">クイック入力：</span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className="chip-btn"
          onClick={() => {
            if (!currentValue.trim()) {
              onReplace(opt);
            } else {
              onAppend(opt);
            }
          }}
        >
          + {opt}
        </button>
      ))}
    </div>
  );
}
