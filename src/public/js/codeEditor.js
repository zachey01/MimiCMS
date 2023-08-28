function renderEditor(filename) {
	const editor = document.getElementById('editor-alert');
	editor.innerHTML = `<div
class="alert alert-info alert-dismissible fade show bg-white"
role="alert"
id="editor-alert">
<iframe
    src="/admin/edit/${filename}"
    frameborder="0"
    width="100%"
    height="100%"></iframe>
<button
    type="button"
    class="btn-close"
    data-bs-dismiss="alert"
    aria-label="Close"
></button>
</div>`;
}
