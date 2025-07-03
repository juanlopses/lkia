const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

// Servir frontend
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
      return res.status(500).json({ error: 'Error al subir la imagen' });
    }

    const imageUrl = 'https://telegra.ph' + uploadData[0].src;
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://api.neoxr.eu/api/photo-editor?image=${encodeURIComponent(imageUrl)}&q=${encodeURIComponent(instruction)}&apikey=${apiKey}`;

    // 2. Llamar a la API de edición
    const apiResp = await fetch(apiUrl);
    const apiData = await apiResp.json();

    fs.unlink(file.path, () => {}); // borrar archivo temporal

    if (!apiData.status || !apiData.data?.url) {
      return res.status(500).json({ error: 'Fallo al procesar la imagen' });
    }

    res.json({ url: apiData.data.url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
