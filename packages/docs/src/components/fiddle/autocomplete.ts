import {javascriptLanguage} from '@codemirror/lang-javascript';
import {syntaxTree} from '@codemirror/language';

function isConstructor(obj: any) {
  return !!obj.prototype && !!obj.prototype.constructor.name;
}

const Options: {label: string; type: string}[] = [];

function loadModule(module: Record<string, unknown>) {
  Object.entries(module).forEach(([name, value]) => {
    Options.push({
      label: name,
      type:
        typeof value === 'function'
          ? isConstructor(value)
            ? 'class'
            : 'function'
          : 'variable',
    });
  });
}

if (typeof window !== 'undefined') {
  import(/* webpackIgnore: true */ '@revideo/core')
    .then(loadModule)
    .catch(() => {});
  import(/* webpackIgnore: true */ '@revideo/2d')
    .then(loadModule)
    .catch(() => {});
}

export function autocomplete() {
  return javascriptLanguage.data.of({
    autocomplete: (context: any) => {
      const nodeBefore = syntaxTree(context.state).resolveInner(
        context.pos,
        -1,
      );
      if (nodeBefore.name === 'String') return null;

      const word = context.matchBefore(/\w*/);
      if (!word || (word.from === word.to && !context.explicit)) return null;
      return {
        from: word.from,
        options: Options,
      };
    },
  });
}
