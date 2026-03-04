const express = require('express');
const sharp = require('sharp');
const app = express();

// Aumentamos el límite porque los base64 pueden ser pesados
app.use(express.text({ type: '*/*', limit: '50mb' }));

// Función mágica para descargar imágenes de internet y meterlas al SVG
async function embedImagesInSVG(svg) {
    const urlRegex = /href=["'](https?:\/\/[^"']+)["']/g;
    let match;
    let newSvg = svg;
    const urls = [];

    // Buscamos todas las URLs dentro del SVG
    while ((match = urlRegex.exec(svg)) !== null) {
        if (!urls.includes(match[1])) urls.push(match[1]);
    }

    // Descargamos cada imagen y la convertimos a Base64
    for (const url of urls) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Detectamos si es JPG o PNG
            let mimeType = 'image/png';
            if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';

            const base64 = buffer.toString('base64');
            const dataUri = `data:${mimeType};base64,${base64}`;

            // Reemplazamos la URL externa por el código de la imagen incrustada
            newSvg = newSvg.split(url).join(dataUri);
        } catch (err) {
            console.error(`No se pudo descargar la imagen: ${url}`);
        }
    }
    return newSvg;
}

app.post('/convertir', async (req, res) => {
    try {
        let svgString = req.body;
        
        if (!svgString || !svgString.includes('<svg')) {
            return res.status(400).send("No se detectó un código SVG válido.");
        }

        // 1. Incrustamos las imágenes externas primero
        svgString = await embedImagesInSVG(svgString);

        // 2. Ahora sí, le pasamos el SVG con las imágenes incrustadas a sharp
        const pngBuffer = await sharp(Buffer.from(svgString))
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.send(pngBuffer);

    } catch (error) {
        // Mejoramos el mensaje de error para saber qué falla exactamente si vuelve a pasar
        console.error("Error detallado:", error);
        res.status(500).send(`Error interno: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
