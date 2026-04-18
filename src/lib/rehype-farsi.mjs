import { visit } from 'unist-util-visit';

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

export function rehypeFarsi() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || !parent.children) return;
      ARABIC_RE.lastIndex = 0;
      if (!ARABIC_RE.test(node.value)) return;
      ARABIC_RE.lastIndex = 0;

      const parts = [];
      let last = 0;
      let m;
      while ((m = ARABIC_RE.exec(node.value)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        parts.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['farsi'], dir: 'rtl' },
          children: [{ type: 'text', value: m[0] }],
        });
        last = ARABIC_RE.lastIndex;
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });

      parent.children.splice(index, 1, ...parts);
      return [visit.SKIP, index + parts.length];
    });
  };
}
