hljs.highlightAll();

function saveChanges() {
	const code = document.getElementById('code-editor').innerText;
	const filename = document
		.getElementById('code-editor')
		.getAttribute('data-filename');
	if (!filename) {
		return console.error('Attribute not found');
	}

	fetch('/admin/save/' + encodeURIComponent(filename), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ code: code })
	})
		.then(() => {
			alert('Changes saved successfully!');
		})
		.catch(error => {
			console.error(error);
			alert('Error. Please check console');
		});
}
