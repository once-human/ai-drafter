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

function applyAutoLayoutProps(frame, props = {}) {
  frame.layoutMode = (props.layout === 'horizontal' || props.layoutMode === 'horizontal') ? 'HORIZONTAL' : 'VERTICAL';
  frame.primaryAxisAlignItems = props.primaryAxisAlignItems || 'MIN';
  frame.counterAxisAlignItems = props.counterAxisAlignItems || 'MIN';
  frame.itemSpacing = typeof props.itemSpacing === 'number' ? props.itemSpacing : 12;
  frame.paddingLeft = typeof props.paddingLeft === 'number' ? props.paddingLeft : (typeof props.padding === 'number' ? props.padding : 16);
  frame.paddingRight = typeof props.paddingRight === 'number' ? props.paddingRight : (typeof props.padding === 'number' ? props.padding : 16);
  frame.paddingTop = typeof props.paddingTop === 'number' ? props.paddingTop : (typeof props.padding === 'number' ? props.padding : 16);
  frame.paddingBottom = typeof props.paddingBottom === 'number' ? props.paddingBottom : (typeof props.padding === 'number' ? props.padding : 16);
  frame.layoutSizingHorizontal = props.layoutSizingHorizontal || 'HUG';
  frame.layoutSizingVertical = props.layoutSizingVertical || 'HUG';
  if (props.minWidth) frame.minWidth = props.minWidth;
  if (props.minHeight) frame.minHeight = props.minHeight;
}

async function renderUIInFigma(ui) {
  resetComponentRegistry();
  figma.currentPage.selection = [];

  // Multi-screen support
  if (ui.type === 'multi-screen' && Array.isArray(ui.screens)) {
    let x = 100;
    let y = 100;
    const screenFrames = [];
    for (let i = 0; i < ui.screens.length; i++) {
      const screen = ui.screens[i];
      const frame = await createNodeFromComponent({ ...screen, type: 'screen' }, { x, y });
      frame.name = screen.name || `Screen ${i + 1}`;
      figma.currentPage.appendChild(frame);
      screenFrames.push(frame);
      x += 500;
    }
    // Add flow arrows (connectors) between screens
    for (let i = 0; i < screenFrames.length - 1; i++) {
      const from = screenFrames[i];
      const to = screenFrames[i + 1];
      const connector = figma.createConnector();
      connector.strokeWeight = 2;
      connector.connectorStart = { endpointNodeId: from.id, magnet: 'AUTO' };
      connector.connectorEnd = { endpointNodeId: to.id, magnet: 'AUTO' };
      connector.text = (ui.flows && ui.flows[i]) ? ui.flows[i] : '';
      figma.currentPage.appendChild(connector);
    }
    figma.viewport.scrollAndZoomIntoView(screenFrames);
    figma.currentPage.selection = screenFrames;
    return;
  }

  // Single screen fallback
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
    applyAutoLayoutProps(frame, component);
    if (component.items || component.components || component.children) {
      const children = (component.items || component.components || component.children).map((child, i) =>
        createNodeFromComponent(child, { x: 0, y: 0 })
      );
      const nodes = await Promise.all(children);
      nodes.forEach(n => {
        frame.appendChild(n);
        // Set constraints for children
        if (n.type === 'TEXT') {
          n.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
        } else if (n.type === 'INSTANCE' && n.mainComponent?.name?.startsWith('Button/')) {
          n.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
          n.resizeWithoutConstraints(frame.width - frame.paddingLeft - frame.paddingRight, n.height);
        } else if (n.type === 'INSTANCE' && n.mainComponent?.name?.startsWith('Card/')) {
          n.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
        } else if (n.type === 'INSTANCE' && n.mainComponent?.name?.startsWith('Header/')) {
          n.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
        } else if (n.type === 'FRAME') {
          n.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
        }
      });
    }
    if (component.minWidth) frame.resizeWithoutConstraints(component.minWidth, frame.height);
    if (component.minHeight) frame.resizeWithoutConstraints(frame.width, component.minHeight);
    return frame;
  } else if (component.type === 'text') {
    const text = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = component.value || '';
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (component.style) {
      if (component.style.fontSize) text.fontSize = component.style.fontSize;
      if (component.style.fontWeight) text.fontName = { family: 'Inter', style: component.style.fontWeight === 'bold' ? 'Bold' : 'Regular' };
    }
    return text;
  } else if (component.type === 'button') {
    const comp = getOrCreateComponent('button', component.label || 'Button', component.style || {});
    const inst = comp.createInstance();
    inst.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
    return inst;
  } else if (component.type === 'card') {
    const comp = getOrCreateComponent('card', component.name || 'Card', component.style || {});
    const inst = comp.createInstance();
    inst.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
    return inst;
  } else if (component.type === 'header') {
    const comp = getOrCreateComponent('header', component.name || 'Header', component.style || {});
    const inst = comp.createInstance();
    inst.constraints = { horizontal: 'STRETCH', vertical: 'TOP' };
    return inst;
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