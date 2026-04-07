// api/analyze.js
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel → Settings → Environment Variables' });

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || !mediaType) return res.status(400).json({ error: 'Faltan campos imageBase64 o mediaType' });

  const today = new Date().toISOString().slice(0, 10);
  const CAT_GASTOS   = ['Alimentación','Arriendo','Servicios','Transporte','Salud','Educación','Entretenimiento','Ropa','Hogar','Mascota','Ahorro','Otro'];
  const CAT_INGRESOS = ['Sueldo','Honorarios','Freelance','Arriendo cobrado','Bono','Regalo','Otro'];

  const prompt = `Eres un asistente que lee boletas, facturas y comprobantes de pago en Chile.
Analiza la imagen. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.
Categorías gastos: ${CAT_GASTOS.join(', ')}.
Categorías ingresos: ${CAT_INGRESOS.join(', ')}.
Hoy es ${today}.
Formato:
{"tipo":"gasto o ingreso","monto":número entero CLP,"fecha":"YYYY-MM-DD","detalle":"máx 50 chars","categoria":"una de las listadas","notas":"opcional máx 80 chars"}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(502).json({ error: `Gemini: ${data.error.message}` });

    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { return res.status(500).json({ error: 'La IA no devolvió JSON válido. Intenta con imagen más clara.' }); }

    return res.status(200).json({ ok: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
