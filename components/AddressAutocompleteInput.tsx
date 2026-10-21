"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

type AddressSuggestion = {
  tekst?: string;
  forslagstekst?: string;
  type?: string;
};

type AddressAutocompleteInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  initialValue?: string;
};

export function AddressAutocompleteInput({
  id,
  name,
  label,
  autoComplete,
  required = false,
  placeholder,
  initialValue = "",
}: AddressAutocompleteInputProps) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const chosenValue = useRef(initialValue);
  const latestQuery = useRef("");

  useEffect(() => {
    const query = value.trim();

    setIsLoading(false);
    setError("");
    setActiveIndex(-1);
    if (query.length < 3 || value === chosenValue.current) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      latestQuery.current = query;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          type: "adresse",
          fuzzy: "true",
          caretpos: String(query.length),
        });

        const response = await fetch(`/api/addresses?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || "Adresseopslag svarede ikke.");
        }

        const data = (await response.json()) as AddressSuggestion[];

        if (latestQuery.current === query) {
          setSuggestions(data.slice(0, 7));
          setIsOpen(data.length > 0);
          if (!data.length) setError("Ingen adresseforslag fundet. Skriv hele adressen inklusive postnummer og by.");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setIsOpen(false);
          setError(error instanceof Error ? error.message : "Adresseopslag svarede ikke.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  function chooseAddress(suggestion: AddressSuggestion) {
    const nextValue = suggestion.tekst ?? suggestion.forslagstekst ?? "";
    chosenValue.current = suggestion.type === "adresse" ? nextValue : "";
    setValue(nextValue);
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <div className="relative grid gap-2">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setIsOpen(suggestions.length > 0)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 140)}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={id + "-suggestions"}
          aria-activedescendant={activeIndex >= 0 ? id + "-suggestion-" + activeIndex : undefined}
          aria-describedby={error ? id + "-error" : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
            if (!isOpen || !suggestions.length) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) =>
                index < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : suggestions.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length,
              );
            }
            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              chooseAddress(suggestions[activeIndex]);
            }
          }}
          className="pr-11"
        />
        <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

      {isOpen ? (
        <div
          id={id + "-suggestions"}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-fjord/30 bg-white shadow-xl shadow-ink/10"
        >
          {suggestions.map((suggestion, index) => {
            const text = suggestion.tekst ?? suggestion.forslagstekst ?? "";

            return (
              <button
                key={`${text}-${index}`}
                id={id + "-suggestion-" + index}
                role="option"
                aria-selected={activeIndex === index}
                style={activeIndex === index ? { backgroundColor: "#e8f3ef" } : undefined}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseAddress(suggestion)}
                className="flex w-full items-start justify-start gap-2 rounded-none px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-fjord/10"
              >
                <MapPin className="mt-0.5 shrink-0 text-bus" size={16} />
                <span>{text}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p id={id + "-error"} role="status" className="text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      {isLoading ? <p className="text-xs font-semibold text-slate-500">Finder adresser...</p> : null}
    </div>
  );
}
