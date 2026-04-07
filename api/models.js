// api/models.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });

  try {
    const modelsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );
    
    const data = await modelsRes.json();
    if (data.error) return res.status(502).json({ error: `Gemini: ${data.error.message}` });

    // Filtrar solo modelos compatibles con generateContent
    const availableModels = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit
      }));

    return res.status(200).json({ models: availableModels });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
