document.getElementById('generate-btn').onclick = function () {
  const prompt = document.getElementById('prompt').value;
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