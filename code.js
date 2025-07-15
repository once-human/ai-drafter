figma.showUI(__html__, { width: 360, height: 520 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'generate-ui') {
    figma.notify('✨ Generate UI placeholder (Phase 1)');
  }
}; 