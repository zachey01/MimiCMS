const DBcfg = document.getElementById('DBcfg-wrapper');

JSONEditor.defaults.options.theme = 'bootstrap5';

const editor = new JSONEditor(DBcfg, {
	theme: 'bootstrap5',
	disable_edit_json: 'true',
	disable_properties: 'true',
	disable_collapse: 'true',
	schema: {
		type: 'object',
		title: 'MYSQL database configuration',
		properties: {
			DB_HOST: {
				type: 'string'
			},
			DB_USER: {
				type: 'string'
			},
			DB_PASSWORD: {
				type: 'string'
			},
			DB_NAME: {
				type: 'string'
			}
		}
	}
});

// // Запрос к маршруту /password
// fetch("/CFGtoken?password=505")
//   .then((response) => {
//     if (response.ok) {
//       return response.text(); // Получаем ответ сервера в виде текста
//     } else {
//       throw new Error("Ошибка запроса");
//     }
//   })
//   .then((data) => {
//     // Hook up the submit button to send the value to the server

//   })
//   .catch((error) => {
//     console.error(error); // Выводим ошибку, если запрос не удался
//   });

// Создание токена
fetch('/api/token')
	.then(response => response.json())
	.then(data => {
		const token = data.token;
		// Отправка токена в запросе к защищенному ресурсу
		fetch('/api/protected', {
			headers: {
				Authorization: token
			}
		})
			.then(response => response.json())
			.then(data => {
				console.log(data.message); // Вывод сообщения доступа разрешен

				document
					.getElementById('submit')
					.addEventListener('click', function () {
						// Get the value from the editor
						var value = editor.getValue();

						// Encrypt the value using AES encryption
						var encryptedValue = CryptoJS.AES.encrypt(
							JSON.stringify(value),
							'123'
						).toString();

						// Send the encrypted value to the server using AJAX
						var xhr = new XMLHttpRequest();
						xhr.open('POST', '/submit');
						xhr.setRequestHeader(
							'Content-Type',
							'application/json'
						);
						xhr.onreadystatechange = function () {
							if (
								xhr.readyState === XMLHttpRequest.DONE &&
								xhr.status === 200
							) {
								console.log('Value sent successfully');
							}
						};
						xhr.send(
							JSON.stringify({ encryptedValue: encryptedValue })
						);
					});
			})
			.catch(error => {
				console.error(error); // Обработка ошибки
			});
	})
	.catch(error => {
		console.error(error); // Обработка ошибки
	});
