"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";

type Field = "role" | "location" | "college" | "company" | "skill";

interface TagSuggestionInputProps {
  field: Field;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  max?: number;
}

export function TagSuggestionInput({
  field,
  values,
  onChange,
  placeholder = "Type and select…",
  label,
  disabled,
  max = 10,
}: TagSuggestionInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const id = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/profile/suggestions?field=${field}&q=${encodeURIComponent(q)}`,
          );
          if (!res.ok) return;
          const data = await res.json() as { suggestions: string[] };
          // Filter out already-selected values
          const filtered = (data.suggestions ?? []).filter((s) => !values.includes(s));
          setSuggestions(filtered);
          setActiveIdx(-1);
        } catch {
          // silent
        }
      }, 120);
    },
    [field, values],
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || values.includes(trimmed) || values.length >= max) return;
    onChange([...values, trimmed]);
    setInputValue("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    fetchSuggestions(v);
    setOpen(true);
  };

  const handleFocus = () => {
    if (!inputValue) {
      fetchSuggestions("");
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !inputValue && values.length > 0) {
      removeTag(values[values.length - 1]);
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        addTag(suggestions[activeIdx]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.closest("[data-tag-suggestion-root]")?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const listId = `${id}-list`;
  const canAdd = values.length < max;

  return (
    <div data-tag-suggestion-root>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--muted-foreground)",
            marginBottom: 6,
            fontFamily: "var(--font-mono-stack)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
          <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.6 }}>
            ({values.length}/{max})
          </span>
        </label>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--line-soft)",
          background: "var(--surface)",
          minHeight: 42,
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              background: "var(--accent-bg)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid var(--accent-line, var(--line-soft))",
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent)",
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 14,
                  opacity: 0.7,
                }}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {canAdd && !disabled && (
          <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
            <input
              id={id}
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && suggestions.length > 0}
              aria-controls={listId}
              aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
              value={inputValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={values.length === 0 ? placeholder : "Add more…"}
              autoComplete="off"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: "var(--foreground)",
                padding: "2px 4px",
              }}
            />

            {open && suggestions.length > 0 && (
              <ul
                id={listId}
                ref={listRef}
                role="listbox"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  maxHeight: 220,
                  overflowY: "auto",
                  margin: 0,
                  padding: "4px 0",
                  listStyle: "none",
                  minWidth: 200,
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      color: i === activeIdx ? "var(--accent)" : "var(--foreground)",
                      background: i === activeIdx ? "var(--surface-soft)" : "transparent",
                    }}
                  >
                    {highlightMatch(s, inputValue)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, fontFamily: "var(--font-mono-stack)" }}>
        Press Enter or comma to add · Backspace to remove
      </p>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "var(--accent)", fontWeight: 600 }}>
        {text.slice(idx, idx + query.trim().length)}
      </strong>
      {text.slice(idx + query.trim().length)}
    </>
  );
}
