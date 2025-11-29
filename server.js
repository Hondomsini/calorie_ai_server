require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

// -------------------------
//  GOOGLE AI INIT
// -------------------------
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY NO DEFINIDA EN .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// CORRECCIÓN 1: Usamos el modelo actual 'gemini-1.5-flash'
// CORRECCIÓN 2: Configuramos 'responseMimeType' para asegurar JSON siempre
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    // Opcional: Definir el esquema ayuda a la IA a ser precisa
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        calories: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        fat: { type: SchemaType.NUMBER },
        fiber: { type: SchemaType.NUMBER },
        sodium: { type: SchemaType.NUMBER },
      },
    },
  },
});

// -------------------------
//    ROUTE: /analyze
// -------------------------
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Leemos el archivo
    const imageBytes = fs.readFileSync(req.file.path);
    const base64Image = imageBytes.toString("base64");

    // Prompt simplificado (ya configuramos JSON arriba)
    const prompt = `Analiza la comida de la imagen. Estima los valores nutricionales con la mayor precisión posible.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype, // Usamos el mimeType real del archivo (ej: image/jpeg o image/png)
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Limpiamos el archivo temporal
    fs.unlinkSync(req.file.path);

    console.log("Respuesta Gemini:", text); // Para depuración

    // Como usamos responseMimeType: "application/json", el texto ya es JSON válido
    // No necesitamos limpiar bloques de código (```json)
    return res.json(JSON.parse(text));

  } catch (err) {
    console.error("SERVER ERROR:", err);
    // Limpieza de archivo en caso de error también
    if (req.file && fs.existsSync(req.file.path)) {
       fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      error: "Error processing image",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
