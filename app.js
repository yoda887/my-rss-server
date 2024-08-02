const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3001;

app.get('/fetch-rss', async (req, res) => {
    const { url, index, limit } = req.query;

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
            const startIndex = parseInt(index);
            const itemLimit = limit ? Math.min(parseInt(limit), items.length - startIndex) : 1;
            const selectedItems = items.slice(startIndex, startIndex + itemLimit);

            // Асинхронно получаем содержимое каждого файла
            await Promise.all(selectedItems.map(async (item) => {
                try {
                    const contentResponse = await axios.get(item.link[0] + '/print');
                    const $ = cheerio.load(contentResponse.data);

                    // Извлекаем текст из элемента <div id="article">
                    const billText = $('#article').text().trim();

                    // Добавляем извлеченный текст к описанию элемента
                    item.description[0] += `<content>${billText}</content>`;
                } catch (contentError) {
                    console.error(`Ошибка при получении содержимого для ${item.link[0]}: ${contentError.message}`);
                }
            }));

            // Преобразуем обратно в XML
            const builder = new xml2js.Builder({
                headless: true,
                renderOpts: { pretty: true }
            });
            const xml = builder.buildObject({ rss: { channel: [{ item: selectedItems }] } });

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
