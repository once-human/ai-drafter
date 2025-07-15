const btn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key-btn');
const useComponentsCheckbox = document.getElementById('useComponents');

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
  const useComponents = !!useComponentsCheckbox.checked;

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
          useComponents,
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
        useComponents,
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
  const useComponents = !!useComponentsCheckbox.checked;
  if (layout.type === 'multi-screen' && Array.isArray(layout.screens)) {
    let out = '';
    layout.screens.forEach(screen => {
      out += `Screen: ${screen.name || ''}\n`;
      const children = screen.components || screen.items || screen.children || [];
      for (const c of children) out += formatLayoutPreview(c, 1, useComponents);
      out += '\n';
    });
    previewDiv.textContent = out;
    insertBtn.disabled = false;
    return;
  }
  previewDiv.textContent = formatLayoutPreview(layout, 0, useComponents);
  insertBtn.disabled = false;
}

function formatLayoutPreview(node, indent = 0, useComponents = false) {
  if (!node) return '';
  const pad = '  '.repeat(indent);
  let out = '';
  const stateTag = node.state ? ` [${node.state}]` : '';
  if (node.type === 'screen') {
    out += `${pad}Screen: ${node.name || ''}\n`;
    const children = node.components || node.items || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1, useComponents);
  } else if (node.type === 'frame') {
    out += `${pad}- Frame: ${node.name || ''}\n`;
    const children = node.items || node.components || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1, useComponents);
  } else if (node.type === 'text') {
    out += `${pad}- Text: "${node.value || ''}"${stateTag}\n`;
  } else if (node.type === 'button') {
    out += `${pad}- Button: ${node.label || ''}${useComponents ? ' [DS Button]' : ''}${stateTag}\n`;
  } else if (node.type === 'input') {
    out += `${pad}- Input: ${node.label || ''}${useComponents ? ' [DS Input]' : ''}${stateTag}\n`;
  } else if (node.type === 'card') {
    out += `${pad}- Card: ${node.name || ''}${useComponents ? ' [DS Card]' : ''}${stateTag}\n`;
    const children = node.items || node.components || [];
    for (const c of children) out += formatLayoutPreview(c, indent + 1, useComponents);
  }
  return out;
}

let previewData = null;
const manualPreviewDiv = document.getElementById('manual-preview');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function renderManualPreview(layout) {
  previewData = deepClone(layout);
  manualPreviewDiv.innerHTML = '';
  if (!layout) return;
  if (layout.type === 'multi-screen' && Array.isArray(layout.screens)) {
    layout.screens.forEach((screen, sIdx) => {
      const header = document.createElement('div');
      header.textContent = `Screen: ${screen.name || ''}`;
      header.style.fontWeight = 'bold';
      header.style.margin = '8px 0 2px 0';
      manualPreviewDiv.appendChild(header);
      renderManualBlockList(screen.components || screen.items || [], [sIdx]);
    });
  } else {
    renderManualBlockList(layout.components || layout.items || [], []);
  }
}

function renderManualBlockList(items, path) {
  items.forEach((item, idx) => {
    if (item == null) return;
    if (item.active === false) return;
    const block = document.createElement('div');
    block.className = 'manual-block';
    // Include toggle
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = item.active !== false;
    toggle.className = 'toggle';
    toggle.title = 'Include';
    toggle.onchange = () => {
      setPreviewDataActive(path, idx, toggle.checked);
      renderManualPreview(previewData);
    };
    block.appendChild(toggle);
    // Editable label
    const label = document.createElement('input');
    label.type = 'text';
    label.value = item.label || item.name || item.value || '';
    label.onchange = () => {
      setPreviewDataLabel(path, idx, label.value);
    };
    block.appendChild(label);
    // State tag
    if (item.state) {
      const stateTag = document.createElement('span');
      stateTag.textContent = `[${item.state}]`;
      stateTag.style.fontSize = '0.95em';
      stateTag.style.color = '#007BFF';
      block.appendChild(stateTag);
    }
    // Up/Down buttons
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.className = 'move-btn';
    upBtn.onclick = () => {
      movePreviewData(path, idx, -1);
      renderManualPreview(previewData);
    };
    block.appendChild(upBtn);
    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.className = 'move-btn';
    downBtn.onclick = () => {
      movePreviewData(path, idx, 1);
      renderManualPreview(previewData);
    };
    block.appendChild(downBtn);
    manualPreviewDiv.appendChild(block);
    // Recursively render children
    if (item.items || item.components) {
      renderManualBlockList(item.items || item.components, path.concat(idx));
    }
  });
}

function setPreviewDataActive(path, idx, active) {
  let arr = previewData;
  for (const p of path) arr = arr.screens ? arr.screens[p] : arr.components || arr.items;
  const items = arr.components || arr.items;
  if (items && items[idx]) items[idx].active = active;
}
function setPreviewDataLabel(path, idx, value) {
  let arr = previewData;
  for (const p of path) arr = arr.screens ? arr.screens[p] : arr.components || arr.items;
  const items = arr.components || arr.items;
  if (items && items[idx]) {
    if (items[idx].label !== undefined) items[idx].label = value;
    else if (items[idx].name !== undefined) items[idx].name = value;
    else if (items[idx].value !== undefined) items[idx].value = value;
  }
}
function movePreviewData(path, idx, dir) {
  let arr = previewData;
  for (const p of path) arr = arr.screens ? arr.screens[p] : arr.components || arr.items;
  const items = arr.components || arr.items;
  if (!items) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= items.length) return;
  const temp = items[idx];
  items[idx] = items[newIdx];
  items[newIdx] = temp;
}

insertBtn.onclick = function () {
  if (!previewData) return;
  const useComponents = !!useComponentsCheckbox.checked;
  const filtered = filterInactive(deepClone(previewData));
  parent.postMessage({ pluginMessage: { type: 'insert-ui', layout: filtered, useComponents } }, '*');
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
    renderManualPreview(layout);
  }
};

function filterInactive(obj) {
  if (Array.isArray(obj)) {
    return obj.filter(x => x.active !== false).map(filterInactive);
  } else if (typeof obj === 'object' && obj !== null) {
    const o = { ...obj };
    if (o.components) o.components = filterInactive(o.components);
    if (o.items) o.items = filterInactive(o.items);
    if (o.screens) o.screens = filterInactive(o.screens);
    return o;
  }
  return obj;
} 