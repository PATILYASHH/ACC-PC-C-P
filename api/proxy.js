module.exports = async (req, res) => {
  const { path } = req.query;
  if (!path) {
    res.status(400).json({ error: "Missing path parameter" });
    return;
  }

  const API_BASE = process.env.API_BASE;
  const API_KEY = process.env.API_KEY;

  if (!API_BASE || !API_KEY) {
    res.status(500).json({
      error: "Env vars not configured",
      has_API_BASE: !!API_BASE,
      has_API_KEY: !!API_KEY
    });
    return;
  }

  const targetUrl = `${API_BASE}${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "apikey": API_KEY,
        "Content-Type": "application/json"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      res.status(response.status).json({
        error: `Upstream API error: ${response.status}`,
        upstream_body: text.substring(0, 500),
        target: targetUrl
      });
      return;
    }

    try {
      res.status(200).json(JSON.parse(text));
    } catch (e) {
      res.status(500).json({ error: "Upstream returned non-JSON", body: text.substring(0, 500) });
    }
  } catch (err) {
    res.status(500).json({
      error: "Fetch failed",
      message: err.message,
      cause: (err.cause && (err.cause.message || err.cause.code)) || null,
      target: targetUrl
    });
  }
};
