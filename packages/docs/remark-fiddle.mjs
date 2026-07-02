import {visit} from 'unist-util-visit';

/**
 * Turns fenced code blocks tagged with the `editor` meta (e.g. ```tsx editor,
 * ```tsx editor mode=preview, ```tsx editor ratio=2) into <Fiddle> elements,
 * the interactive editor + revideo preview player. The original code fence is
 * kept as a child so the server still renders a statically highlighted block,
 * which the Fiddle shows until CodeMirror mounts.
 *
 * The Fiddle component itself is registered in mdx-components.js.
 */
export default function remarkFiddle() {
  return tree => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const meta = node.meta ?? '';
      if (!/\beditor\b/.test(meta)) return;

      const attributes = [
        // The code must be passed as an expression ({"..."} instead of a
        // plain string attribute): nextra compiles pages with jsx preserved,
        // and the JSX transform collapses raw newlines inside string
        // attribute values to spaces, which would corrupt the snippet.
        {
          type: 'mdxJsxAttribute',
          name: 'code',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: JSON.stringify(node.value),
            data: {
              estree: {
                type: 'Program',
                sourceType: 'module',
                body: [
                  {
                    type: 'ExpressionStatement',
                    expression: {
                      type: 'Literal',
                      value: node.value,
                      raw: JSON.stringify(node.value),
                    },
                  },
                ],
              },
            },
          },
        },
      ];
      const mode = /\bmode=(\w+)/.exec(meta);
      if (mode) {
        attributes.push({type: 'mdxJsxAttribute', name: 'mode', value: mode[1]});
      }
      const ratio = /\bratio=([\d./]+)/.exec(meta);
      if (ratio) {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'ratio',
          value: ratio[1],
        });
      }

      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Fiddle',
        attributes,
        children: [{...node, meta: null}],
      };
    });
  };
}
