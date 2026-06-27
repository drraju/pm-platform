function getLocalApiBaseUrl() {
  if (typeof window !== "undefined" && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://localhost:3001";
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || getLocalApiBaseUrl();
