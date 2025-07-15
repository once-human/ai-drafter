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

let cachedLayout = null;
const previewDiv = document.getElementById('preview');
const insertBtn = document.getElementById('insert-btn');
insertBtn.disabled = true;

function renderPreview(layout) {
  if (!layout) {
    previewDiv.textContent = 'No layout to preview.';
    insertBtn.disabled = true;
    return;
  }
  previewDiv.textContent = formatLayoutPreview(layout);
  insertBtn.disabled = false;
}

function formatLayoutPreview(node, indent = 0) {
  if (!node) return '';
  const pad = '  '.repeat(indent);
  let out = '';
  if (node.type === 'screen') {
    out += `${pad}Screen: ${node.name || ''}\n`;
    const children = node.components || node.items || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1);
  } else if (node.type === 'frame') {
    out += `${pad}- Frame: ${node.name || ''}\n`;
    const children = node.items || node.components || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1);
  } else if (node.type === 'text') {
    out += `${pad}- Text: "${node.value || ''}"\n`;
  } else if (node.type === 'button') {
    out += `${pad}- Button: ${node.label || ''}\n`;
  } else if (node.type === 'input') {
    out += `${pad}- Input: ${node.label || ''}\n`;
  } else if (node.type === 'card') {
    out += `${pad}- Card: ${node.name || ''}\n`;
    const children = node.items || node.components || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1);
  }
  return out;
}

insertBtn.onclick = function () {
  if (!cachedLayout) return;
  parent.postMessage({ pluginMessage: { type: 'insert-ui', layout: cachedLayout } }, '*');
};

window.onmessage = (event) => {
  const { type, loading, apiKey, message, layout, error } = event.data.pluginMessage || {};
  if (type === 'loading') {
    if (loading) {
      btn.disabled = true;
      btn.textContent = 'Generating...';
      insertBtn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent = '✨ Generate UI';
    }
  } else if (type === 'api-key') {
    apiKeyInput.value = apiKey || '';
  } else if (type === 'error') {
    alert(message || error || 'An error occurred.');
    previewDiv.textContent = 'No layout to preview.';
    insertBtn.disabled = true;
  } else if (type === 'success') {
    alert(message || 'Saved!');
  } else if (type === 'preview') {
    cachedLayout = layout;
    renderPreview(layout);
  }
}; 