const express = require('express');
const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

function getDirectoryContent(dirPath) {
	const files = fs.readdirSync(dirPath);
	return files.map(file => {
		const filePath = path.join(dirPath, file);
		const isDirectory = fs.statSync(filePath).isDirectory();
		return {
			name: file,
			isDirectory,
			path: filePath
		};
	});
}

function getFileContent(filePath) {
	const fileContent = fs.readFileSync(filePath, 'utf8');
	if (filePath.endsWith('.js')) {
		return hljs.highlight('javascript', fileContent).value;
	}
	return fileContent;
}

app.get('/', (req, res) => {
	const files = getDirectoryContent('./public');
	res.send(`
    <h1>File Manager</h1>
    <ul>
      ${files
			.map(
				file => `
        <li>
          <a href="/view/${encodeURIComponent(file.path)}">${file.name}${
				file.isDirectory ? '/' : ''
			}</a>
        </li>
      `
			)
			.join('')}
    </ul>
  `);
});

app.get('/view/:path', (req, res) => {
	const filePath = decodeURIComponent(req.params.path);

	if (fs.existsSync(filePath)) {
		if (fs.statSync(filePath).isDirectory()) {
			const files = getDirectoryContent(filePath);
			res.send(`
        <h1>${filePath}</h1>
        <ul>
          ${files
				.map(
					file => `
            <li>
              <a href="/view/${encodeURIComponent(file.path)}">${file.name}${
					file.isDirectory ? '/' : ''
				}</a>
            </li>
          `
				)
				.join('')}
        </ul>
      `);
		} else {
			const fileContent = getFileContent(filePath);
			res.send(`
        <h1>${filePath}</h1>
		<pre><code class="language-js">${fileContent}</code></pre>
          
          <br>
          <button type="submit">Save</button>
        
        <script src="https://cdn.jsdelivr.net/npm/highlight.js"></script>
        <script>hljs.highlightAll();</script>
      `);
		}
	} else {
		res.send('File not found');
	}
});

app.post('/save/:path', (req, res) => {
	const filePath = decodeURIComponent(req.params.path);
	const { content } = req.body;

	fs.writeFileSync(filePath, content);
	res.redirect('/');
});

app.listen(PORT, () => {
	console.log(`File Manager app is listening on port ${PORT}`);
});
