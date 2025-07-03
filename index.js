const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Crear carpeta tmp si no existe
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

// Multer configuración para guardar en /tmp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/tmp', express.static(tmpDir)); // para servir imágenes temporales

// Procesamiento principal
app.post('/api/process', upload.single('image'), async (req, res) => {
  const instruction = req.body.instruction;
  const file = req.file;

  if (!file || !instruction) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }

  try {
    const filePath = path.join(tmpDir, file.filename);
    const fileUrl = `${req.protocol}://${req.get('host')}/tmp/${file.filename}`;

    // Enviar a la API usando la URL local
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://api.neoxr.eu/api/photo-editor?image=${encodeURIComponent(fileUrl)}&q=${encodeURIComponent(instruction)}&apikey=${apiKey}`;

    const apiResp = await fetch(apiUrl);
    const apiData = await apiResp.json();

    // Borrar imagen después de 2 minutos
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al borrar imagen:', err.message);
      });
    }, 2 * 60 * 1000);

    if (!apiData.status || !apiData.data?.url) {
      return res.status(500).json({ error: 'Error al procesar la imagen.' });
    }

    res.json({ url: apiData.data.url });

  } catch (error) {
    console.error('Error del servidor:', error.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
