export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  
  if (!res.ok) {
    // Attempt to parse JSON error, otherwise fallback to text
    let errorMsg = res.statusText;
    try {
      const errData = await res.json();
      errorMsg = errData.message || errorMsg;
    } catch {
      const textData = await res.text();
      if (textData) errorMsg = textData;
    }
    const error = new Error(errorMsg) as any;
    error.status = res.status;
    throw error;
  }
  
  return res;
}
