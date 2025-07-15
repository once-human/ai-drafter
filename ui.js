const btn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');

btn.onclick = function () {
  const prompt = promptInput.value;
  const tokens = document.getElementById('tokens').value;
  const imageInput = document.getElementById('image');
  const imageFile = imageInput.files[0];

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64image = e.target.result.split(',')[1]; // Remove data:image/...;base64,
      parent.postMessage({
        pluginMessage: {
          type: 'generate-ui',
          prompt,
          tokens,
          imageName: imageFile.name,
          base64image
        }
      }, '*');
    };
    reader.readAsDataURL(imageFile);
  } else {
    parent.postMessage({
      pluginMessage: {
        type: 'generate-ui',
        prompt,
        tokens,
        imageName: null,
        base64image: null
      }
    }, '*');
  }
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