// Search bar component
import { useState, useCallback, useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = '搜尋物品...' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);

  // Debounce the search - only trigger when not composing
  useEffect(() => {
    if (isComposingRef.current) return;

    const timer = setTimeout(() => {
      onChange(localValue);
    }, 150);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value changes - but not during composition
  useEffect(() => {
    if (!isComposingRef.current && value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          // Trigger search after composition ends
          setLocalValue((e.target as HTMLInputElement).value);
        }}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded-lg text-[var(--ffxiv-text)] placeholder-[var(--ffxiv-muted)] focus:outline-none focus:border-[var(--ffxiv-accent)] transition-colors"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[var(--ffxiv-highlight)]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
