require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // Delete temp file
    fs.unlinkSync(req.file.path);

    return res.json(JSON.parse(output));
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Error processing image", details: err.message });
  }
});

// -------------------------
//       START SERVER
// -------------------------
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
