const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.text({ type: '*/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

app.post('/convertir', async (req, res) => {
    let browser;
    try {
        let svgString = req.body;

        if (typeof svgString === 'object') {
            svgString = svgString.svg_limpio || svgString.svg || JSON.stringify(svgString);
        }
        svgString = String(svgString || '');

        if (!svgString.includes('<svg')) {
            return res.status(400).send("No se detectó un código SVG válido.");
        }

        // 1. ARGUMENTOS CRÍTICOS DE MOTOR GRÁFICO: 
        // Desactivamos el GPU (evita los cuadros negros) y forzamos el perfil de color
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security', 
                '--allow-file-access-from-files',
                '--disable-gpu', // <--- EVITA QUE EL FOREIGN OBJECT SE VEA NEGRO
                '--force-color-profile=srgb',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        
        const page = await browser.newPage();

        // 2. EXTRAEMOS DIMENSIONES ANTES DE RENDERIZAR
        // Buscamos el width y height en el string del SVG para configurar el lienzo primero
        const widthMatch = svgString.match(/width="([^"%]+)"/);
        const heightMatch = svgString.match(/height="([^"%]+)"/);
        const lienzoWidth = widthMatch ? parseInt(widthMatch[1]) : 1920;
        const lienzoHeight = heightMatch ? parseInt(heightMatch[1]) : 1080;

        // 3. CONFIGURAMOS EL VIEWPORT AL TAMAÑO EXACTO DESDE EL INICIO
        await page.setViewport({
            width: lienzoWidth,
            height: lienzoHeight,
            deviceScaleFactor: 2 // Alta calidad
        });

        // 4. HTML BLINDADO PARA PANTALLA COMPLETA
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    /* Forzamos a que no haya márgenes y el body mida exacto el viewport */
                    body, html { 
                        margin: 0; 
                        padding: 0; 
                        width: ${lienzoWidth}px; 
                        height: ${lienzoHeight}px; 
                        background: transparent; 
                        overflow: hidden; 
                    }
                    /* El SVG debe llenar la pantalla */
                    svg { 
                        display: block; 
                        width: 100%; 
                        height: 100%; 
                    }
                    * { font-family: 'Montserrat', sans-serif !important; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        // 5. CARGAMOS CONTENIDO Y ESPERAMOS
        await page.setContent(htmlContent, { 
            waitUntil: ['load', 'networkidle0'], 
            timeout: 90000 
        });

        // 6. ASEGURAMOS QUE LAS FUENTES Y FOTOS RESPONDAN
        await page.evaluateHandle('document.fonts.ready');
        
        // Pausa forzada de 1.5 segundos: Da tiempo a que el background-image y el Flexbox 
        // terminen de acomodarse en la tarjeta de video (crucial para evitar partes negras).
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 7. FOTOGRAFÍA DE PÁGINA COMPLETA (NO AL ELEMENTO SVG)
        // Esto soluciona el bug de Puppeteer al recortar foreignObjects
        const pngBuffer = await page.screenshot({
            type: 'png',
            fullPage: false, // Ya tenemos el viewport exacto
            omitBackground: true
        });

        await browser.close();

        // 8. RESPUESTA
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `attachment; filename="diseno_${lienzoWidth}x${lienzoHeight}.png"`);
        res.send(pngBuffer);

    } catch (error) {
        if (browser) await browser.close();
        console.error("Error en conversión:", error);
        res.status(500).send(`Error interno: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
