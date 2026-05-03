interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
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
            <textarea
              id={`field-${field.key}`}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              rows={4}
              placeholder={field.placeholder}
            />
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
