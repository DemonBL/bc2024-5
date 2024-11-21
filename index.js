const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const express = require('express');

const program = new Command();
const app = express();

program
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера')
  .requiredOption('-c, --cache <cache>', 'Шлях до директорії кешу')
  .helpOption('-H, --help', 'Відображення довідки');

program.parse(process.argv);
const options = program.opts();

const { host, port, cache } = options;

// Перевірка, чи існує директорія кешу
if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache, { recursive: true });
}

// Middleware для роботи із запитами
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Додано для обробки JSON-запитів

// Маршрут для обробки запитів до кореневого URL
app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

// Маршрут для отримання нотатки
app.get('/notes/:name', (req, res) => {
  const filePath = path.join(cache, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.send(fs.readFileSync(filePath, 'utf-8'));
});

// Маршрут для оновлення нотатки
app.put('/notes/:name', (req, res) => {
  const filePath = path.join(cache, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  fs.writeFileSync(filePath, req.body || '');
  res.send('Note updated');
});

// Маршрут для видалення нотатки
app.delete('/notes/:name', (req, res) => {
  const filePath = path.join(cache, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  fs.unlinkSync(filePath);
  res.send('Note deleted');
});

// Маршрут для отримання списку нотаток
app.get('/notes', (req, res) => {
  const files = fs.readdirSync(cache).map(name => ({
    name,
    text: fs.readFileSync(path.join(cache, name), 'utf-8'),
  }));
  res.status(200).json(files);
});

// Маршрут для створення нової нотатки
app.post('/write', (req, res) => {
  const { note_name, note } = req.body;

  if (!note_name || !note) {
    return res.status(400).send('Note name and text are required');
  }

  const filePath = path.join(cache, note_name);
  if (fs.existsSync(filePath)) {
    return res.status(400).send('Note already exists');
  }

  fs.writeFileSync(filePath, note);
  res.status(201).send('Note created');
});

// Маршрут для отримання HTML форми
app.get('/UploadForm.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload Note</title>
    </head>
    <body>
        <form action="/write" method="post">
            <label for="note_name">Note Name:</label>
            <input type="text" id="note_name" name="note_name" required>
            <br>
            <label for="note">Note Text:</label>
            <textarea id="note" name="note" required></textarea>
            <br>
            <button type="submit">Upload</button>
        </form>
    </body>
    </html>
  `);
});

// Запуск сервера
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
