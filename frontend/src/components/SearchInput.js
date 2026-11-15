"use client";

import React from "react";
import { Search, X } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  style,
}) {
  return (
    <div className="input-with-icon" style={{ minWidth: 220, ...style }}>
      <span className="input-icon-left">
        <Search size={15} />
      </span>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else onChange("");
          }}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-subtle)",
            padding: 2,
            display: "flex",
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

