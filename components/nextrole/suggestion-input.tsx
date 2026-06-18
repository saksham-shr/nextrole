"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";

type Field = "role" | "location" | "college" | "company" | "skill" | "degree" | "field_of_study" | "certification";

interface SuggestionInputProps {
  field: Field;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function SuggestionInput({
  field,
  value,
  onChange,
  placeholder,
  label,
  disabled,
  className = "",
}: SuggestionInputProps) {
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
          setSuggestions(data.suggestions ?? []);
          setActiveIdx(-1);
        } catch {
          // silent — suggestions are non-critical
        }
      }, 120);
    },
    [field],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (v.length > 0) {
      fetchSuggestions(v);
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleFocus = () => {
    if (value.length === 0) {
      fetchSuggestions("");
      setOpen(true);
    } else if (suggestions.length > 0) {
      setOpen(true);
    }
  };

  const selectItem = (item: string) => {
    onChange(item);
    setOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectItem(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.closest("[data-suggestion-root]")?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const listId = `${id}-list`;

  return (
    <div data-suggestion-root style={{ position: "relative" }}>
      {label && (
        <label
          htmlFor={id}
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
        </label>
      )}
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={className || undefined}
        style={className ? undefined : {
          width: "100%",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid var(--line-soft)",
          background: "var(--surface)",
          color: "var(--foreground)",
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.15s",
        }}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 240,
            overflowY: "auto",
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); selectItem(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
                color: i === activeIdx ? "var(--accent)" : "var(--foreground)",
                background: i === activeIdx ? "var(--surface-soft)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              {highlightMatch(s, value)}
            </li>
          ))}
        </ul>
      )}
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
