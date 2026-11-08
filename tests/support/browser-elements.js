// UI modules request canvas handles at import time. Tests provide just the controls they exercise.
export function installBrowserElements(elements) {
  const canvas = () => ({ getContext: () => ({}), setAttribute() {} });
  const nodes = new Map([
    ['hl-world', canvas()],
    ['hl-editor', canvas()],
    ['hl-globe-gpu', canvas()],
    ...Object.entries(elements),
  ]);
  globalThis.document = {
    getElementById: (id) => nodes.get(id) ?? null,
    createElement: (name) => {
      if (name === 'canvas') return canvas();
      throw new Error('Unexpected element: ' + name);
    },
  };
  return nodes;
}
