import { visit } from 'unist-util-visit';

// Match Arabic/Persian runs including spaces between Arabic words
const ARABIC_RE = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+(\s+[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+)*)/g;

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
          properties: { className: ['farsi'] },
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
