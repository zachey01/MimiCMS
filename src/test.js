const express = require('express');
const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');

const app = express();
const rootFolder = __dirname;

const bodyParser = require('body-parser');

// Разбор данных в формате JSON
app.use(bodyParser.json());

// Главная страница
app.get('/', (req, res) => {
	// Чтение содержимого папки
	fs.readdir(rootFolder, { withFileTypes: true }, (err, files) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		// Фильтрация папок и файлов
		const folders = files
			.filter(file => file.isDirectory())
			.map(folder => folder.name);
		const filesList = files
			.filter(file => file.isFile())
			.map(file => file.name);

		// Отправка шаблона с данными
		res.send(`
      <ul>
        ${folders
			.map(folder => `<li><a href="/folder/${folder}">${folder}</a></li>`)
			.join('')}
      </ul>
      <ul>
        ${filesList
			.map(file => `<li><a href="/edit/${file}">${file}</a></li>`)
			.join('')}
      </ul>
    `);
	});
});

// Страница редактора кода для выбранного файла или папки
app.get('/edit/:path(*)', (req, res) => {
	const filePath = path.join(rootFolder, req.params.path);

	// Проверка существования файла или папки
	if (!fs.existsSync(filePath)) {
		return res.status(404).send('Файл или папка не найдены');
	}

	// Если путь указывает на папку, перенаправляем на страницу содержимого папки
	if (fs.lstatSync(filePath).isDirectory()) {
		return res.redirect(`/folder/${req.params.path}`);
	}

	// Чтение содержимого файла
	fs.readFile(filePath, 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		// Подсветка синтаксиса кода
		const highlightedCode = hljs.highlightAuto(data).value;

		// Отправка шаблона с данными
		res.send(`
		<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap');
</style>
      <h1>Редактор: ${req.params.path}</h1>
      <pre><code class="javascript" id="code-editor" contenteditable="true" spellcheck="false" style="font-family: 'JetBrains Mono', monospace">${highlightedCode}</code></pre>
      <br>
      <button onclick="saveChanges('${req.params.path}')">Сохранить</button>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/highlight.min.js"></script>
      <script>hljs.initHighlightingOnLoad();</script>
      <script>
        function saveChanges(filename) {
          const code = document.getElementById('code-editor').innerText;
          fetch('/save/' + filename, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code }),
          })
            .then(() => {
              alert('Изменения сохранены');
              window.location.href = '/';
            })
            .catch((error) => {
              console.error(error);
              alert('Ошибка при сохранении изменений');
            });
        }
      </script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/styles/atom-one-dark.min.css" rel="stylesheet">
    `);
	});
});

// Страница содержимого выбранной папки
app.get('/folder/:path(*)', (req, res) => {
	const folderPath = path.join(rootFolder, req.params.path);

	// Проверка существования папки
	if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
		return res.status(404).send('Папка не найдена');
	}

	// Чтение содержимого папки
	fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		// Фильтрация папок и файлов
		const folders = files
			.filter(file => file.isDirectory())
			.map(folder => folder.name);
		const filesList = files
			.filter(file => file.isFile())
			.map(file => file.name);

		// Отправка шаблона с данными
		res.send(`
      <h1>Содержимое папки: ${req.params.path}</h1>
      <h2>Папки:</h2>
      <ul>
        ${folders
			.map(
				folder =>
					`<li><a href="/folder/${req.params.path}/${folder}">${folder}</a></li>`
			)
			.join('')}
      </ul>
      <h2>Файлы:</h2>
      <ul>
        ${filesList
			.map(
				file =>
					`<li><a href="/edit/${req.params.path}/${file}">${file}</a></li>`
			)
			.join('')}
      </ul>
      <a href="/edit/${req.params.path}/newfile">Создать новый файл</a>
      <br>
      <a href="/edit/${req.params.path}/newfolder">Создать новую папку</a>
      <br>
      <a href="/edit/${req.params.path}/rename">Переименовать папку</a>
      <br>
      <a href="/edit/${req.params.path}/delete">Удалить папку</a>
      <br>
      <a href="/">Назад</a>
    `);
	});
});

// Обработка сохранения изменений в файле
app.post('/save/:path(*)', (req, res) => {
	const filePath = path.join(rootFolder, req.params.path);

	// Проверка существования файла
	if (!fs.existsSync(filePath)) {
		return res.status(404).send('Файл не найден');
	}

	// Получение данных из тела запроса
	const { code } = req.body;

	// Запись данных в файл
	fs.writeFile(filePath, code, err => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		res.sendStatus(200);
	});
});

// Запуск сервера
app.listen(3000, () => {
	console.log('Сервер запущен на порту 3000');
});
