interface SearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export default function SearchInput({
  id,
  value,
  onChange,
  placeholder = "Buscar…",
  label = "Buscar",
  inputRef,
  className = "",
}: SearchInputProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <div
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-100"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded-full p-1"
            aria-label="Limpiar búsqueda"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="search"
          enterKeyHint="search"
          className="block w-full rounded-2xl border border-white/10 bg-slate-800/30 backdrop-blur-xl py-2 pl-12 pr-10 text-[16px] md:py-2.5 text-slate-100 placeholder:text-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.08)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:shadow-[0_0_20px_rgba(255,255,255,0.12)] sm:text-base"
        />
      </div>
    </div>
  );
}
