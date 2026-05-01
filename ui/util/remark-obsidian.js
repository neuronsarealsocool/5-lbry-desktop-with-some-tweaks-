// Remark inline plugins for Obsidian-style syntax not in standard markdown:
//   ==highlight==  →  <mark>
//   ^superscript^  →  <sup>
//   ~subscript~    →  <sub>
//
// Uses data.hName so mdast-util-to-hast converts the custom MDAST node type
// to a proper HAST element — this works for unknown node types because
// mdast-util-to-hast falls back to data.hName when no handler is registered.

// ----------------------------------------------------------------------------
// ==highlight== → <mark>
// ----------------------------------------------------------------------------

const MARK_TYPE = 'mdMark';

function locateMark(value, fromIndex) {
  return value.indexOf('==', fromIndex);
}

function tokenizeMark(eat, value, silent) {
  if (!value.startsWith('==')) return;
  const end = value.indexOf('==', 2);
  if (end === -1 || end === 2) return;
  if (silent) return true;
  const inner = value.slice(2, end);
  return eat(value.slice(0, end + 2))({
    type: MARK_TYPE,
    children: [{ type: 'text', value: inner }],
    data: { hName: 'mark', hChildren: [{ type: 'text', value: inner }] },
  });
}
tokenizeMark.locator = locateMark;

export function inlineMark() {
  const { inlineTokenizers, inlineMethods } = this.Parser.prototype;
  inlineTokenizers.mark = tokenizeMark;
  inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'mark');
}

// ----------------------------------------------------------------------------
// ^superscript^ → <sup>
// ----------------------------------------------------------------------------

const SUP_TYPE = 'mdSup';

function locateSup(value, fromIndex) {
  return value.indexOf('^', fromIndex);
}

function tokenizeSup(eat, value, silent) {
  if (!value.startsWith('^')) return;
  const end = value.indexOf('^', 1);
  if (end === -1 || end === 1) return;
  if (silent) return true;
  const inner = value.slice(1, end);
  return eat(value.slice(0, end + 1))({
    type: SUP_TYPE,
    children: [{ type: 'text', value: inner }],
    data: { hName: 'sup', hChildren: [{ type: 'text', value: inner }] },
  });
}
tokenizeSup.locator = locateSup;

export function inlineSup() {
  const { inlineTokenizers, inlineMethods } = this.Parser.prototype;
  inlineTokenizers.sup = tokenizeSup;
  inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'sup');
}

// ----------------------------------------------------------------------------
// ~subscript~ → <sub>  (must not match ~~strikethrough~~)
// ----------------------------------------------------------------------------

const SUB_TYPE = 'mdSub';

function locateSub(value, fromIndex) {
  const idx = value.indexOf('~', fromIndex);
  // Skip ~~ (strikethrough) positions
  if (idx !== -1 && value[idx + 1] === '~') return value.indexOf('~', idx + 2);
  return idx;
}

function tokenizeSub(eat, value, silent) {
  // Don't match ~~strikethrough~~
  if (!value.startsWith('~') || value.startsWith('~~')) return;
  const end = value.indexOf('~', 1);
  if (end === -1 || end === 1) return;
  if (silent) return true;
  const inner = value.slice(1, end);
  return eat(value.slice(0, end + 1))({
    type: SUB_TYPE,
    children: [{ type: 'text', value: inner }],
    data: { hName: 'sub', hChildren: [{ type: 'text', value: inner }] },
  });
}
tokenizeSub.locator = locateSub;

export function inlineSub() {
  const { inlineTokenizers, inlineMethods } = this.Parser.prototype;
  inlineTokenizers.sub = tokenizeSub;
  inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'sub');
}
