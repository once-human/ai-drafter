const btn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key-btn');

// Request stored API key on load
window.addEventListener('DOMContentLoaded', () => {
  parent.postMessage({ pluginMessage: { type: 'get-api-key' } }, '*');
});

// Save API key
saveKeyBtn.onclick = function () {
  const apiKey = apiKeyInput.value.trim();
  parent.postMessage({ pluginMessage: { type: 'save-api-key', apiKey } }, '*');
};

btn.onclick = function () {
  const prompt = promptInput.value;
  const tokens = document.getElementById('tokens').value;
  const imageInput = document.getElementById('image');
  const imageFile = imageInput.files[0];
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    window.postMessage({ pluginMessage: { type: 'error', message: 'Please enter your OpenAI API key.' } }, '*');
    return;
  }

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64image = e.target.result.split(',')[1];
      parent.postMessage({
        pluginMessage: {
          type: 'generate-ui',
          prompt,
          tokens,
          apiKey,
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
        apiKey,
        imageName: null,
        base64image: null
      }
    }, '*');
  }
};

window.onmessage = (event) => {
  const { type, loading, apiKey, message } = event.data.pluginMessage || {};
  if (type === 'loading') {
    if (loading) {
      btn.disabled = true;
      btn.textContent = 'Generating...';
    } else {
      btn.disabled = false;
      btn.textContent = '✨ Generate UI';
    }
  } else if (type === 'api-key') {
    apiKeyInput.value = apiKey || '';
  } else if (type === 'error') {
    alert(message || 'An error occurred.');
  } else if (type === 'success') {
    // Optionally show a success message for saving key
    alert(message || 'Saved!');
  }
}; 