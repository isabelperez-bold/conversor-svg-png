const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Aceptamos los formatos que envía n8n
app.use(express.text({ type: '*/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' })); 

app.post('/convertir', async (req, res) => {
    let browser;
    try {
        let svgString = req.body;

        // Extraemos el SVG si n8n lo envía como JSON
        if (typeof svgString === 'object') {
            svgString = svgString.svg_limpio || svgString.svg || JSON.stringify(svgString);
        }
        svgString = String(svgString || '');

        if (!svgString.includes('<svg')) {
            return res.status(400).send("No se detectó un código SVG válido.");
        }

        // 1. Lanzamos el Google Chrome invisible (Puppeteer)
        // Usamos parámetros especiales para que funcione bien en servidores en la nube como Render
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();

        // 2. Envolvemos el SVG en un HTML básico
        // Esto asegura que los márgenes sean cero y se vea perfecto
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { margin: 0; padding: 0; background: transparent; }
                    svg { display: block; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        // 3. Cargamos el código en la página
        // IMPORTANTE: waitUntil: 'networkidle0' obliga al navegador a ESPERAR 
        // hasta que todas las fotos de internet y fuentes (Google Fonts) se hayan descargado.
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 4. Buscamos el elemento SVG para tomarle la foto exacta a su tamaño
        const svgElement = await page.$('svg');
        
        if (!svgElement) {
            throw new Error("No se pudo renderizar el SVG en el navegador invisible.");
        }

        // 5. Tomamos la captura de pantalla en formato PNG
        const pngBuffer = await svgElement.screenshot({
            type: 'png',
            omitBackground: true // Mantiene el fondo transparente si el SVG no tiene fondo
        });

        await browser.close();

        // 6. Enviamos la imagen a n8n lista y con nombre
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', 'attachment; filename="imagen_generada.png"');
        res.send(pngBuffer);

    } catch (error) {
        // Si hay error, cerramos el navegador para no consumir memoria
        if (browser) await browser.close();
        console.error("Error detallado:", error);
        res.status(500).send(`Error interno: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Puppeteer activo en puerto ${PORT}`);
});
