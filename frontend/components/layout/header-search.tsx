"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  flattenSearchResults,
  searchWorkspace,
  type SearchResults,
} from "@/features/search";

const emptyResults: SearchResults = { customers: [], projects: [], work: [] };

export function HeaderSearch() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const hits = useMemo(() => flattenSearchResults(results), [results]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(emptyResults);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchWorkspace(term)
        .then((next) => {
          if (!cancelled) {
            setResults(next);
            setActiveIndex(0);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) setResults(emptyResults);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function openHit(index: number) {
    const hit = hits[index];
    if (!hit) return;
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(hits.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openHit(activeIndex);
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 2;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search customers, projects, and work
      </label>
      <input
        aria-activedescendant={showList && hits[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={showList ? listId : undefined}
        aria-expanded={showList}
        aria-label="Search customers, projects, and work"
        autoComplete="off"
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        id={`${listId}-input`}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search customers, projects, and work"
        ref={inputRef}
        role="combobox"
        value={query}
      />
      {showList ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matches.</p>
          ) : (
            hits.map((hit, index) => {
              const previous = hits[index - 1];
              return (
                <React.Fragment key={`${hit.group}-${hit.id}`}>
                  {hit.group !== previous?.group ? (
                    <p className="px-3 pb-1 pt-2 text-xs font-medium text-slate-500">{hit.group}</p>
                  ) : null}
                  <button
                    aria-selected={index === activeIndex}
                    className={`block w-full px-3 py-1.5 text-left text-sm ${
                      index === activeIndex ? "bg-slate-100 text-slate-950" : "text-slate-800"
                    }`}
                    id={`${listId}-${index}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      openHit(index);
                    }}
                    role="option"
                    type="button"
                  >
                    <span className="font-medium">{hit.name}</span>
                    {hit.parent ? <span className="text-slate-500"> · {hit.parent}</span> : null}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
