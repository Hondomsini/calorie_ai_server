require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();
app.use(cors());

// Configuración de multer (asegura que guarda el archivo)
const upload = multer({ dest: "uploads/" });

// -------------------------
//  GOOGLE AI INIT
// -------------------------
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY NO DEFINIDA EN .env");
  process.exit(1);
}

// Inicialización de la API de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SOLUCIÓN FINAL: Usamos el alias de visión moderno 'gemini-2.5-flash'
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    // Forzamos la respuesta a ser JSON
    responseMimeType: "application/json",
    // Definimos el esquema exacto para la respuesta
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Nombre del alimento, ej: 'Manzana roja'." },
        calories: { type: SchemaType.NUMBER, description: "Estimación de calorías en Kcal." },
        protein: { type: SchemaType.NUMBER, description: "Gramos de proteína." },
        carbs: { type: SchemaType.NUMBER, description: "Gramos de carbohidratos." },
        fat: { type: SchemaType.NUMBER, description: "Gramos de grasa." },
        fiber: { type: SchemaType.NUMBER, description: "Gramos de fibra." },
        sodium: { type: SchemaType.NUMBER, description: "Miligramos de sodio." },
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

    // Leemos el archivo y lo convertimos a Base64
    const imageBytes = fs.readFileSync(req.file.path);
    const base64Image = imageBytes.toString("base64");
    
    // CORRECCIÓN MIME TYPE: Usamos el mimeType detectado, o forzamos 'image/jpeg' 
    // para evitar el error 'application/octet-stream'.
    const mimeType = req.file.mimetype || "image/jpeg"; 

    const prompt = `Analiza la comida de la imagen. Estima los valores nutricionales con la mayor precisión posible. Responde SOLO con el JSON del esquema proporcionado.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType, 
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Limpiamos el archivo temporal que creó Multer
    fs.unlinkSync(req.file.path);

    console.log("Respuesta Gemini (JSON Puro):", text); 

    // Parseamos la respuesta JSON
    return res.json(JSON.parse(text));

  } catch (err) {
    console.error("SERVER ERROR:", err);
    
    // Limpieza de archivo en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
       fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      error: "Error processing image",
      details: err.message,
    });
  }
});

// -------------------------
//       START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
