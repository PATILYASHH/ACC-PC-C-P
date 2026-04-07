const IS_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";

const API_BASE_DIRECT = "http://185.199.53.139:8001/api/db/v1/banaerp";
const API_KEY = "db_682eaa9d3192ed72a00a0e101cf9fd8efeb3d172ee04969b0547e834d091a803";

async function apiFetch(path) {
  if (IS_LOCAL) {
    // Local dev: call API directly (no mixed content issue on http://localhost)
    const res = await fetch(API_BASE_DIRECT + path, {
      headers: {
        "apikey": API_KEY,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  } else {
    // Production (Vercel): use serverless proxy to avoid mixed content
    const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  }
}

async function fetchSalesOrders(limit = 50, offset = 0) {
  return apiFetch(`/rest/sales_orders?order=-order_date&limit=${limit}&offset=${offset}`);
}

async function fetchCastings() {
  return apiFetch("/rest/castings?limit=2000");
}
