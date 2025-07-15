// --- OpenAI API Key (placeholder, replace with env or settings in future) ---
const OPENAI_API_KEY = 'sk-...'; // TODO: Replace with your OpenAI API key
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Generate UI layout from prompt using OpenAI GPT-4o
 * @param {string} prompt
 * @returns {Promise<GeneratedUI>}
 */
async function generateUIFromPrompt(prompt, apiKey, tokens) {
  let systemPrompt = `You are a UI assistant. Based on the user's prompt, image (optional), and design tokens (optional), return a complete structured JSON layout suitable for rendering in Figma. Use the design tokens strictly to influence color, spacing, font, and styling.\nReturn only valid JSON.`;
  if (tokens) {
    systemPrompt += `\nDesign system details:\n${tokens}`;
  }
  const systemMessage = {
    role: 'system',
    content: systemPrompt
  };
  const userMessage = { role: 'user', content: prompt };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [systemMessage, userMessage],
      temperature: 0.2,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API error: ' + response.status);
  }
  const data = await response.json();
  let jsonText = data.choices?.[0]?.message?.content;
  // Try to extract JSON if model returns markdown
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json|```/g, '').trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Invalid JSON from OpenAI');
  }
}

/**
 * Generate UI layout from prompt + image using OpenAI GPT-4o Vision
 * @param {string} prompt
 * @param {string} base64image
 * @returns {Promise<GeneratedUI>}
 */
async function generateUIFromImage(prompt, base64image, apiKey, tokens) {
  if (!base64image) throw new Error('No image data provided');
  // Check image size (base64 is ~33% larger than binary)
  const imageBytes = Math.floor((base64image.length * 3) / 4);
  if (imageBytes > MAX_IMAGE_SIZE) {
    throw new Error('Image is too large (max 2MB)');
  }
  let systemPrompt = `You are a UI assistant. Based on the user's prompt, image (optional), and design tokens (optional), return a complete structured JSON layout suitable for rendering in Figma. Use the design tokens strictly to influence color, spacing, font, and styling.\nReturn only valid JSON.`;
  if (tokens) {
    systemPrompt += `\nDesign system details:\n${tokens}`;
  }
  const systemMessage = {
    role: 'system',
    content: systemPrompt
  };
  const userMessage = {
    role: 'user',
    content: [
      { type: 'text', text: prompt || 'Analyze this UI and return a layout.' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64image}` } }
    ]
  };
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [systemMessage, userMessage],
      temperature: 0.2,
      max_tokens: 900
    })
  });
  if (!response.ok) {
    throw new Error('OpenAI API error: ' + response.status);
  }
  const data = await response.json();
  let jsonText = data.choices?.[0]?.message?.content;
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json|```/g, '').trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Invalid JSON from OpenAI');
  }
}

let componentRegistry = {};

function resetComponentRegistry() {
  componentRegistry = {};
}

function getOrCreateComponent(type, name, style = {}) {
  const key = `${type}:${name}`;
  if (componentRegistry[key]) {
    return componentRegistry[key];
  }
  let component;
  if (type === 'button') {
    component = figma.createComponent();
    component.name = `Button/${name}`;
    component.resize(120, 40);
    component.fills = [{ type: 'SOLID', color: hexToRgb(style.backgroundColor || '#007BFF') }];
    const text = figma.createText();
    text.characters = name;
    text.fontSize = style.fontSize || 16;
    text.fills = [{ type: 'SOLID', color: hexToRgb(style.color || '#fff') }];
    text.x = 16;
    text.y = 10;
    component.appendChild(text);
    text.x = (component.width - text.width) / 2;
    text.y = (component.height - text.height) / 2;
  } else if (type === 'card') {
    component = figma.createComponent();
    component.name = `Card/${name}`;
    component.resize(240, 120);
    component.fills = [{ type: 'SOLID', color: hexToRgb(style.backgroundColor || '#f8f9fa') }];
    component.cornerRadius = style.radius || 12;
  } else if (type === 'header') {
    component = figma.createComponent();
    component.name = `Header/${name}`;
    component.resize(320, 48);
    component.fills = [{ type: 'SOLID', color: hexToRgb(style.backgroundColor || '#007BFF') }];
    const text = figma.createText();
    text.characters = name;
    text.fontSize = style.fontSize || 20;
    text.fills = [{ type: 'SOLID', color: hexToRgb(style.color || '#fff') }];
    component.appendChild(text);
    text.x = 16;
    text.y = (component.height - text.height) / 2;
  }
  componentRegistry[key] = component;
  figma.currentPage.appendChild(component);
  return component;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const num = parseInt(hex, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

async function renderUIInFigma(ui) {
  resetComponentRegistry();
  figma.currentPage.selection = [];
  const root = await createNodeFromComponent(ui, { x: 100, y: 100 });
  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.currentPage.selection = [root];
}

async function createNodeFromComponent(component, pos) {
  if (component.type === 'screen' || component.type === 'frame') {
    const frame = figma.createFrame();
    frame.name = component.name || 'Frame';
    frame.x = pos.x;
    frame.y = pos.y;
    frame.layoutMode = component.layout === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = 24;
    frame.itemSpacing = 16;
    if (component.items || component.components) {
      const children = (component.items || component.components).map((child, i) =>
        createNodeFromComponent(child, { x: 0, y: 0 })
      );
      const nodes = await Promise.all(children);
      nodes.forEach(n => frame.appendChild(n));
    }
    return frame;
  } else if (component.type === 'text') {
    const text = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = component.value || '';
    if (component.style) {
      if (component.style.fontSize) text.fontSize = component.style.fontSize;
      if (component.style.fontWeight) text.fontName = { family: 'Inter', style: component.style.fontWeight === 'bold' ? 'Bold' : 'Regular' };
    }
    return text;
  } else if (component.type === 'button') {
    const comp = getOrCreateComponent('button', component.label || 'Button', component.style || {});
    return comp.createInstance();
  } else if (component.type === 'card') {
    const comp = getOrCreateComponent('card', component.name || 'Card', component.style || {});
    return comp.createInstance();
  } else if (component.type === 'header') {
    const comp = getOrCreateComponent('header', component.name || 'Header', component.style || {});
    return comp.createInstance();
  } else {
    return figma.createFrame();
  }
}

figma.showUI(__html__, { width: 360, height: 520 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-api-key') {
    const storedKey = await figma.clientStorage.getAsync('openai_api_key');
    figma.ui.postMessage({ type: 'api-key', apiKey: storedKey || '' });
    return;
  }
  if (msg.type === 'save-api-key') {
    await figma.clientStorage.setAsync('openai_api_key', msg.apiKey || '');
    figma.ui.postMessage({ type: 'success', message: 'API key saved!' });
    return;
  }
  if (msg.type === 'generate-ui') {
    const prompt = msg.prompt?.trim();
    const base64image = msg.base64image;
    const apiKey = msg.apiKey?.trim();
    const tokens = msg.tokens?.trim();
    if (!apiKey) {
      figma.notify('API key is missing');
      figma.ui.postMessage({ type: 'loading', loading: false });
      return;
    }
    if (!prompt && !base64image) {
      figma.notify('Please enter a prompt or upload an image.');
      figma.ui.postMessage({ type: 'loading', loading: false });
      return;
    }
    figma.ui.postMessage({ type: 'loading', loading: true });
    try {
      let ui;
      if (base64image) {
        ui = await generateUIFromImage(prompt, base64image, apiKey, tokens);
      } else {
        ui = await generateUIFromPrompt(prompt, apiKey, tokens);
      }
      figma.ui.postMessage({ type: 'preview', layout: ui });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', error: e.message });
    } finally {
      figma.ui.postMessage({ type: 'loading', loading: false });
    }
    return;
  }
  if (msg.type === 'insert-ui') {
    const layout = msg.layout;
    if (!layout) {
      figma.notify('No layout to insert.');
      return;
    }
    try {
      await renderUIInFigma(layout);
      figma.notify('UI inserted to Figma!');
    } catch (e) {
      figma.notify('Error inserting UI: ' + e.message);
    }
    return;
  }
}; 