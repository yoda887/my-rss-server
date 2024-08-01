const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = process.env.PORT || 3001;
const rssUrl = 'https://feeds.feedburner.com/gov/gnjU';

app.get('/fetch-rss', async (req, res) => {
    try {
        // Получаем данные с RSS-канала
        const response = await axios.get(rssUrl);
        const rssData = response.data;

        // Парсим XML данные
        xml2js.parseString(rssData, async (err, result) => {
            if (err) {
                return res.status(500).send('Ошибка при парсинге XML данных');
            }

            const items = result.rss.channel[0].item;

            // Асинхронно получаем содержимое каждого файла
            await Promise.all(items.map(async (item) => {
                try {
                    const contentResponse = await axios.get(item.link[0]);
                    item.description[0] += `<content>${contentResponse.data}</content>`;
                } catch (contentError) {
                    console.error(`Ошибка при получении содержимого для ${item.link[0]}: ${contentError.message}`);
                }
            }));

            // Преобразуем обратно в XML
            const builder = new xml2js.Builder({
                headless: true,
                renderOpts: { pretty: true }
            });
            const xml = builder.buildObject(result);

            // Установка заголовков для XML ответа
            res.header('Content-Type', 'application/xml');
            res.send(xml);
        });
    } catch (error) {
        res.status(500).send('Ошибка при получении данных с RSS-канала');
    }
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
