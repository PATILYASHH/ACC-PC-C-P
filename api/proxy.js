export default async function handler(req, res) {
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  const API_BASE = process.env.API_BASE;
  const API_KEY = process.env.API_KEY;

  if (!API_BASE || !API_KEY) {
    return res.status(500).json({ error: "API_BASE or API_KEY not configured" });
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "apikey": API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
