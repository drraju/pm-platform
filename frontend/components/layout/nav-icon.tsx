import React from "react";

export function NavIcon({ id }: { id: string }) {
  const className = "size-4 shrink-0";

  if (id === "projects") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
        <path
          d="M2.5 4.5h4l1 1.5h6v6.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (id === "programs") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
        <path
          d="M2.5 5.5 8 2.5l5.5 3v5L8 13.5 2.5 10.5v-5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path d="M2.5 8.5 8 11.5l5.5-3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (id === "customers") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
        <path
          d="M2.5 6.5 8 2.75 13.5 6.5V13.5h-11V6.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path d="M6.5 13.5V9h3v4.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (id === "people") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
        <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2.5 12.5c.4-2 1.8-3 3.5-3s3.1 1 3.5 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="11" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10.2 9.6c1.3.2 2.3.9 2.8 2.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M3.4 12.6l1.05-1.05M11.55 4.45l1.05-1.05"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
