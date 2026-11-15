import React from "react";

export default function FilterDropdown({
  value,
  onChange,
  options = [],
  placeholder,
  style,
}) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ minWidth: 150, ...style }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

