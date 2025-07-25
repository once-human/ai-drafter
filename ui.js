const btn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key-btn');
const useComponentsCheckbox = document.getElementById('useComponents');
const exportType = document.getElementById('export-type');
const generateCodeBtn = document.getElementById('generate-code-btn');
const codeOutput = document.getElementById('code-output');
const copyCodeBtn = document.getElementById('copy-code-btn');
const historyList = document.getElementById('history-list');
const undoBtn = document.getElementById('undo-btn');
let history = [];
const feedbackList = document.getElementById('feedback-list');
let comments = [];

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

generateCodeBtn.onclick = function () {
  if (!previewData) return;
  const language = exportType.value;
  parent.postMessage({
    pluginMessage: {
      type: 'generate-code',
      layoutJson: previewData,
      language
    }
  }, '*');
};

copyCodeBtn.onclick = function () {
  if (!codeOutput.value) return;
  codeOutput.select();
  document.execCommand('copy');
  copyCodeBtn.textContent = 'Copied!';
  setTimeout(() => (copyCodeBtn.textContent = 'Copy Code'), 1200);
};

function addToHistory(layout, usedFramework) {
  const now = new Date();
  const ts = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const summary = summarizeLayout(layout);
  history.unshift({ layout: deepClone(layout), usedFramework, timestamp: ts, summary });
  if (history.length > 10) history = history.slice(0, 10);
  renderHistory();
}

function summarizeLayout(layout) {
  if (!layout) return 'No layout';
  if (layout.type === 'multi-screen' && Array.isArray(layout.screens)) {
    return layout.screens.map(s => `${s.name || 'Screen'} - ${countComponents(s)} components`).join(' | ');
  }
  return `${layout.name || 'Screen'} - ${countComponents(layout)} components`;
}
function countComponents(node) {
  if (!node) return 0;
  let count = 0;
  if (node.components) count += node.components.length;
  if (node.items) count += node.items.length;
  if (node.screens) count += node.screens.length;
  return count;
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const header = document.createElement('div');
    header.className = 'history-item-header';
    header.textContent = item.summary;
    div.appendChild(header);
    const meta = document.createElement('div');
    meta.className = 'history-item-meta';
    meta.textContent = item.timestamp;
    div.appendChild(meta);
    const btns = document.createElement('div');
    btns.className = 'history-item-btns';
    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Insert Again';
    insertBtn.onclick = () => {
      parent.postMessage({ pluginMessage: { type: 'insert-ui', layout: item.layout, useComponents: !!useComponentsCheckbox.checked } }, '*');
    };
    btns.appendChild(insertBtn);
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Code';
    exportBtn.onclick = () => {
      const language = exportType.value;
      parent.postMessage({ pluginMessage: { type: 'generate-code', layoutJson: item.layout, language } }, '*');
    };
    btns.appendChild(exportBtn);
    div.appendChild(btns);
    historyList.appendChild(div);
  });
}

undoBtn.onclick = function () {
  parent.postMessage({ pluginMessage: { type: 'undo-last-insert' } }, '*');
};

function renderFeedback(layout) {
  feedbackList.innerHTML = '';
  if (!layout) return;
  // For each screen/component, allow feedback
  if (layout.type === 'multi-screen' && Array.isArray(layout.screens)) {
    layout.screens.forEach((screen, sIdx) => {
      renderFeedbackBlock(screen, [sIdx], `Screen: ${screen.name || ''}`);
      (screen.components || []).forEach((comp, cIdx) => {
        renderFeedbackBlock(comp, [sIdx, cIdx], comp.label || comp.name || comp.type);
      });
    });
  } else {
    renderFeedbackBlock(layout, [], layout.name || layout.label || layout.type);
    (layout.components || []).forEach((comp, cIdx) => {
      renderFeedbackBlock(comp, [cIdx], comp.label || comp.name || comp.type);
    });
  }
}

function renderFeedbackBlock(targetObj, path, label) {
  const div = document.createElement('div');
  div.className = 'feedback-item';
  const meta = document.createElement('div');
  meta.className = 'feedback-meta';
  meta.textContent = label;
  div.appendChild(meta);
  // Existing comments
  comments.filter(c => arrayEq(c.target, path)).forEach(c => {
    const cmt = document.createElement('div');
    cmt.className = 'feedback-comment';
    cmt.textContent = c.comment;
    div.appendChild(cmt);
    if (c.mentions && c.mentions.length) {
      const m = document.createElement('div');
      m.className = 'feedback-mentions';
      m.textContent = 'Mentions: ' + c.mentions.join(', ');
      div.appendChild(m);
    }
    if (c.aiSuggestion) {
      const ai = document.createElement('div');
      ai.className = 'feedback-ai';
      ai.textContent = 'AI Feedback: ' + c.aiSuggestion;
      div.appendChild(ai);
    }
  });
  // Input for new comment
  const input = document.createElement('input');
  input.className = 'feedback-input';
  input.placeholder = 'Add a comment...';
  div.appendChild(input);
  // Mention input
  const mention = document.createElement('input');
  mention.className = 'feedback-mention';
  mention.placeholder = '@mention';
  div.appendChild(mention);
  // Actions
  const actions = document.createElement('div');
  actions.className = 'feedback-actions';
  // Add Note
  const addBtn = document.createElement('button');
  addBtn.textContent = '💬 Add Note';
  addBtn.onclick = () => {
    if (!input.value.trim()) return;
    comments.push({
      target: path,
      comment: input.value.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mentions: mention.value ? mention.value.split(',').map(s => s.trim()).filter(Boolean) : []
    });
    renderFeedback(previewData);
  };
  actions.appendChild(addBtn);
  // AI Suggestion
  const aiBtn = document.createElement('button');
  aiBtn.textContent = '🤖 Suggest Improvements';
  aiBtn.onclick = () => {
    parent.postMessage({ pluginMessage: { type: 'get-ai-feedback', componentJson: targetObj, screenName: label } }, '*');
  };
  actions.appendChild(aiBtn);
  div.appendChild(actions);
  feedbackList.appendChild(div);
}
function arrayEq(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Add to history on preview
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
    addToHistory(layout);
    renderFeedback(layout);
  } else if (type === 'code-output') {
    codeOutput.value = message || '';
  } else if (type === 'ai-feedback') {
    // Find comment for target, add aiSuggestion
    const { target, suggestion } = event.data.pluginMessage;
    let found = comments.find(c => arrayEq(c.target, target));
    if (!found) {
      comments.push({ target, comment: '', aiSuggestion: suggestion });
    } else {
      found.aiSuggestion = suggestion;
    }
    renderFeedback(previewData);
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