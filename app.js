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
        xml2js.parseString(rssData, (err, result) => {
            if (err) {
                return res.status(500).send('Ошибка при парсинге XML данных');
            }

            // Отправляем результат клиенту
            res.json(result);
        });
    } catch (error) {
        res.status(500).send('Ошибка при получении данных с RSS-канала');
    }
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
