// api/analyze.js — Función serverless (Vercel la ejecuta automáticamente)
export default async function handler(req, res) {
  // Solo acepta POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });
  }

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Faltan campos: imageBase64, mediaType' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const CAT_GASTOS   = ['Alimentación','Arriendo','Servicios','Transporte','Salud','Educación','Entretenimiento','Ropa','Hogar','Mascota','Ahorro','Otro'];
  const CAT_INGRESOS = ['Sueldo','Honorarios','Freelance','Arriendo cobrado','Bono','Regalo','Otro'];

  const prompt = `Eres un asistente especializado en leer boletas, facturas, recibos y comprobantes de pago en Chile.
Analiza esta imagen y extrae los datos. Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra.
Categorías de gastos: ${CAT_GASTOS.join(', ')}.
Categorías de ingresos: ${CAT_INGRESOS.join(', ')}.
Hoy es ${today}.
Formato requerido:
{
  "tipo": "gasto" o "ingreso",
  "monto": número entero en pesos chilenos sin puntos ni símbolos,
  "fecha": "YYYY-MM-DD",
  "detalle": "descripción corta máx 50 caracteres",
  "categoria": "una de las categorías listadas",
  "notas": "info adicional opcional máx 80 caracteres"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Error de Gemini API' });
    }

    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({ ok: true, data: parsed });

  } catch (err) {
    console.error('Error en /api/analyze:', err);
    res.status(500).json({ error: err.message });
  }
}
