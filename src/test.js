const express = require('express');
const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');

const multer = require('multer');
// Update the upload middleware configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const folderPath = rootFolder; // Set destination to the root folder
		cb(null, folderPath);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});

const upload = multer({ dest: './', storage: storage }); // Remove this line

const app = express();
const rootFolder = __dirname;

const bodyParser = require('body-parser');

// Разбор данных в формате JSON
app.use(bodyParser.json());

// Главная страница
app.get('/', (req, res) => {
	if (req.params.path === undefined) {
		req.params.path = '/';
	}
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
		const currentPath = req.path === '/' ? 'home' : req.path;
		const breadcrumbItems = currentPath
			.split('/')
			.filter(item => item !== '');
		const breadcrumbLinks = breadcrumbItems.map((item, index) => {
			const path = `/${breadcrumbItems.slice(0, index + 1).join('/')}`;
			return `<a href="${path}">${item}</a>`;
		});

		res.send(`
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
		
		<h3><kbd>${req.params.path}</kbd></h3>
  
		${folders
			.map(
				folder =>
					`<i class="fa-solid fa-folder" style="margin: 5px"></i><a href="/folder/${folder}">${folder}</a><br>`
			)
			.join('')}
		${filesList
			.map(
				file =>
					`<i class="fa-solid fa-file" style="margin: 5px"></i><a href="/edit/${file}">${file}</a><br>`
			)
			.join('')}
	
		<form action="/upload/${
			req.params.path
		}" method="post" enctype="multipart/form-data" style="width: 250px">
		  <input type="file" name="file" class="form-control" onchange="uploadFile()" />
		</form>
  
		<script>
		  function uploadFile() {
			const form = document.getElementById('uploadForm');
			const fileInput = document.querySelector('input[name="file"]');
  
			// Создание объекта FormData для отправки файла
			const formData = new FormData();
			formData.append('file', fileInput.files[0]);
  
			// Создание объекта XHR и отправка файла
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/upload/');
			xhr.send(formData);
  
			// Обработка ответа сервера
			xhr.onload = function() {
			  if (xhr.status === 200) {
				location.reload();
			  } else {
				console.error('Ошибка загрузки файла');
			  }
			};
		  }
		</script>
	  `);
	});
});

// Страница редактора кода для выбранного файла или папки
app.get('/edit/:path(*)', upload.single('file'), (req, res) => {
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
      <h1>${req.params.path}</h1>
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
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
		<h3><kbd>${req.params.path}</kbd></h3>
		${folders
			.map(
				folder =>
					`<i class="fa-solid fa-folder" style="margin: 5px"></i><a href="/folder/${req.params.path}/${folder}">${folder}</a><br>`
			)
			.join('')}
		${filesList
			.map(
				file =>
					`<i class="fa-solid fa-file" style="margin: 5px"></i><a href="/edit/${req.params.path}/${file}">${file}</a><br>`
			)
			.join('')}
		<form action="/upload/${
			req.params.path
		}" method="post" enctype="multipart/form-data">
		  <input type="file" name="file" />
		  <button type="submit">Загрузить</button>
		</form>
		<br>
		<a href="/">Назад</a>
	  `);
	});
});

app.post('/upload/:path(*)', upload.single('file'), (req, res) => {
	const folderPath = path.join(rootFolder, req.params.path);

	// Check if the folder exists
	if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
		return res.status(404).send('Папка не найдена');
	}

	// Check if a file was uploaded
	if (!req.file) {
		return res.status(400).send('Файл не загружен');
	}

	// Move the uploaded file to the folder
	const filePath = path.join(folderPath, req.file.originalname);
	fs.renameSync(req.file.path, filePath);

	res.sendStatus(200);
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
