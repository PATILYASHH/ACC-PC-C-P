async function apiFetch(path) {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchSalesOrders(limit = 50, offset = 0) {
  return apiFetch(`/rest/sales_orders?order=-order_date&limit=${limit}&offset=${offset}`);
}

async function fetchCastings() {
  return apiFetch("/rest/castings?limit=2000");
}
