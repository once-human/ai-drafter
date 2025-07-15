const btn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');

btn.onclick = function () {
  const prompt = promptInput.value;
  const tokens = document.getElementById('tokens').value;
  const imageInput = document.getElementById('image');
  const imageFile = imageInput.files[0];
  const imageName = imageFile ? imageFile.name : null;

  parent.postMessage({
    pluginMessage: {
      type: 'generate-ui',
      prompt,
      tokens,
      imageName
    }
  }, '*');
};

window.onmessage = (event) => {
  const { type, loading } = event.data.pluginMessage || {};
  if (type === 'loading') {
    if (loading) {
      btn.disabled = true;
      btn.textContent = 'Generating...';
    } else {
      btn.disabled = false;
      btn.textContent = '✨ Generate UI';
    }
  }
}; 