const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3001;

app.get('/fetch-rss', async (req, res) => {
    const { url, index } = req.query;

    if (!url || index === undefined) {
        return res.status(400).send('Bad Request. The request could not be understood or was missing required parameters.');
    }

    try {
        // Получаем данные с RSS-канала
        const response = await axios.get(url);
        const rssData = response.data;

        // Парсим XML данные
        xml2js.parseString(rssData, async (err, result) => {
            if (err) {
                return res.status(500).send('Ошибка при парсинге XML данных');
            }

            const items = result.rss.channel[0].item;
            const item = items[parseInt(index)];

            if (!item) {
                return res.status(400).send('Bad Request. The specified index is out of range.');
            }

            try {
                const contentResponse = await axios.get(item.link[0] + '/print');
                const $ = cheerio.load(contentResponse.data);

                // Извлекаем текст из элемента <div id="article">
                const billText = $('#article').text().trim();

                // Добавляем извлеченный текст к описанию элемента
                item.description[0] += `<content>${billText}</content>`;

                // Преобразуем обратно в XML
                const builder = new xml2js.Builder({
                    headless: true,
                    renderOpts: { pretty: true }
                });
                const xml = builder.buildObject({ rss: { channel: [{ item: [item] }] } });

                // Установка заголовков для XML ответа
                res.header('Content-Type', 'application/xml');
                res.send(xml);
            } catch (contentError) {
                console.error(`Ошибка при получении содержимого для ${item.link[0]}: ${contentError.message}`);
                res.status(500).send('Internal Server Error. The server encountered an error processing the request.');
            }
        });
    } catch (error) {
        res.status(500).send('Ошибка при получении данных с RSS-канала');
    }
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
