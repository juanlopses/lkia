import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint protegido
app.post('/api/process', upload.single('image'), async (req, res) => {
  const instruction = req.body.instruction;
  const file = req.file;

  if (!file || !instruction) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // 1. Subir imagen a telegra.ph
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));

    const uploadResp = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResp.json();
    if (!uploadData[0]?.src) {
      return res.status(500).json({ error: 'Fallo al subir imagen' });
    }

    const imageUrl = 'https://telegra.ph' + uploadData[0].src;
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://api.neoxr.eu/api/photo-editor?image=${encodeURIComponent(imageUrl)}&q=${encodeURIComponent(instruction)}&apikey=${apiKey}`;

    // 2. Procesar imagen con IA
    const apiResp = await fetch(apiUrl);
    const apiData = await apiResp.json();

    fs.unlink(file.path, () => {}); // borrar imagen temporal

    if (!apiData.status || !apiData.data?.url) {
      return res.status(500).json({ error: 'Fallo al procesar imagen' });
    }

    res.json({ url: apiData.data.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
