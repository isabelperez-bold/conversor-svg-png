const express = require('express');
const sharp = require('sharp');
const app = express();

app.use(express.text({ type: '*/*', limit: '10mb' }));

app.post('/convertir', async (req, res) => {
    try {
        const svgString = req.body;
        
        if (!svgString || !svgString.includes('<svg')) {
            return res.status(400).send("No se detectó un código SVG válido.");
        }

        const pngBuffer = await sharp(Buffer.from(svgString))
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.send(pngBuffer);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error interno convirtiendo el SVG");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
