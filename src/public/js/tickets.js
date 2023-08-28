function submitForm(event) {
	event.preventDefault();
	let data = $('#text').val();
	$.ajax({
		url: '/tickets/send',
		type: 'POST',
		data: data,
		success: function (response) {
			$('#successModal').modal('show');
		},
		error: function (error) {
			console.error('error', error);
		}
	});
}
