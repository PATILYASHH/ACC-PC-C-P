export default async function handler(req, res) {
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  const API_BASE = process.env.API_BASE || "http://185.199.53.139:8001/api/db/v1/banaerp";
  const API_KEY = process.env.API_KEY || "db_682eaa9d3192ed72a00a0e101cf9fd8efeb3d172ee04969b0547e834d091a803";

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
