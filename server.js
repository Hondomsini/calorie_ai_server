require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

console.log("✅ GEMINI_API_KEY detectada correctamente.");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// -------------------------
//    ROUTE: /analyze
// -------------------------
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imageBytes = fs.readFileSync(req.file.path);

    const prompt = `
      Analiza la comida de la imagen y devuelve SOLO JSON con el formato EXACTO:

      {
        "name": "texto",
        "calories": numero,
        "protein": numero,
        "carbs": numero,
        "fat": numero,
        "fiber": numero,
        "sodium": numero
      }

      No escribas nada más.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBytes.toString("base64"),
        },
      },
      { text: prompt },
    ]);

    const output = result.response.text();

    fs.unlinkSync(req.file.path);

    return res.json(JSON.parse(output));
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res
      .status(500)
      .json({ error: "Error processing image", details: err.message });
  }
});

// -------------------------
//       START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
