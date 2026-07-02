/* eslint-disable @typescript-eslint/naming-convention */
import * as Babel from '@babel/standalone';
import type {View2D} from '@revideo/2d';
import type {SceneDescription, ThreadGeneratorFactory} from '@revideo/core';

export class TransformError extends Error {
  public constructor(
    message: string,
    public errors: {from: number; to: number; tooltip?: string}[],
  ) {
    super(message);
  }
}

export function transform(code: string, name: string): string {
  const filename = `${name}.tsx`;
  const undeclaredVariables = new Set<string>();
  const errors: {from: number; to: number; tooltip: string}[] = [];
  let result: {code?: string | null} | null = null;
  let errorMessage: string | null = null;
  try {
    result = Babel.transform(code, {
      filename,
      presets: [
        'typescript',
        [
          'react',
          {
            runtime: 'automatic',
            importSource: '@revideo/2d',
          },
        ],
      ],
      plugins: [
        (({types}: {types: any}) => ({
          visitor: {
            ImportDeclaration(path: any) {
              if (path.node.source.value.startsWith('@revideo/core')) {
                path.node.source.value = '@revideo/core';
              }
              if (path.node.source.value.startsWith('@revideo/2d')) {
                path.node.source.value = '@revideo/2d';
              }
            },
            ReferencedIdentifier(path: any) {
              const {node, scope} = path;

              if (types.isIdentifier(node) && !scope.hasBinding(node.name)) {
                undeclaredVariables.add(node.name);
                errors.push({
                  from: node.start,
                  to: node.end,
                  tooltip: `Cannot find name '${node.name}'.`,
                });
              }
            },
          },
        })) as any,
      ],
    });
  } catch (error: any) {
    const match = /(.*) \(\d+:\d+\)/.exec(
      error.message.slice(filename.length + 1),
    );
    errorMessage = match ? match[1] : error.message;
    if (error.loc) {
      errors.push({
        from: error.pos as number,
        to: error.pos as number,
        tooltip: errorMessage ?? error.message,
      });
    }
  }

  if (errors.length > 0) {
    throw new TransformError(
      errorMessage ??
        `Cannot find names: ${Array.from(undeclaredVariables).join(
          ', ',
        )}\nDid you forget to import them?`,
      errors,
    );
  }

  return result?.code ?? '';
}

export async function compileScene(
  code: string,
  name: string,
): Promise<SceneDescription<ThreadGeneratorFactory<View2D>>> {
  const transformedCode = transform(code, name);
  const scene = await import(
    /* webpackIgnore: true */ URL.createObjectURL(
      new Blob([transformedCode], {type: 'text/javascript'}),
    )
  );
  return scene.default;
}
