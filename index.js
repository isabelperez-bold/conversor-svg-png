const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Aumentamos el límite de recepción para SVG pesados
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

        // 1. Lanzamos el navegador con SUPERPODERES (Apagamos la seguridad CORS)
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security', // <--- MAGIA 1: Permite cargar fotos de internet en about:blank
                '--allow-file-access-from-files' // <--- MAGIA 2: Evita bloqueos locales
            ]
        });
        
        const page = await browser.newPage();

        // 2. Preparamos el HTML
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { margin: 0; padding: 0; background: transparent; overflow: hidden; }
                    svg { display: block; width: 100%; height: auto; }
                    * { font-family: 'Montserrat', 'Noto Color Emoji', sans-serif !important; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        // 3. Cargamos el contenido
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 90000 
        });

        // <--- MAGIA 3: Obligamos a Puppeteer a esperar que Montserrat se dibuje antes de tomar la foto
        await page.evaluateHandle('document.fonts.ready');

        // 4. Detectamos las dimensiones reales del SVG
        const dimensions = await page.evaluate(() => {
            const svg = document.querySelector('svg');
            if (!svg) return null;
            
            const bbox = svg.getBBox();
            const width = parseInt(svg.getAttribute('width')) || bbox.width || 1080;
            const height = parseInt(svg.getAttribute('height')) || bbox.height || 1080;
            
            return { width, height };
        });

        if (!dimensions) throw new Error("No se pudo encontrar el elemento SVG.");

        // 5. Ajustamos el Viewport con Alta Densidad (deviceScaleFactor: 2)
        await page.setViewport({
            width: dimensions.width,
            height: dimensions.height,
            deviceScaleFactor: 2 
        });

        // Agregamos una mínima pausa técnica para asegurar que el viewport acomode el Flexbox
        await new Promise(resolve => setTimeout(resolve, 500));

        // 6. Capturamos la zona exacta del SVG
        const svgElement = await page.$('svg');
        const pngBuffer = await svgElement.screenshot({
            type: 'png',
            omitBackground: true
        });

        await browser.close();

        // 7. Respuesta a n8n
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `attachment; filename="diseno_${dimensions.width}x${dimensions.height}.png"`);
        res.send(pngBuffer);

    } catch (error) {
        if (browser) await browser.close();
        console.error("Error en conversión:", error);
        res.status(500).send(`Error interno: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de alta definición activo en puerto ${PORT}`);
});
