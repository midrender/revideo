'use client';

import {indentWithTab} from '@codemirror/commands';
import {javascript} from '@codemirror/lang-javascript';
import {syntaxHighlighting} from '@codemirror/language';
import {EditorState, Text} from '@codemirror/state';
import {EditorView, keymap} from '@codemirror/view';
import type {Player} from '@revideo/core';
import clsx from 'clsx';
import {basicSetup} from 'codemirror';
import {usePathname} from 'next/navigation';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import Dropdown from './Dropdown';
import {
  borrowPlayer,
  disposePlayer,
  tryBorrowPlayer,
  updatePlayer,
} from './SharedPlayer';
import {autocomplete} from './autocomplete';
import {clearErrors, errorExtension, underlineErrors} from './errorHighlighting';
import {areImportsFolded, foldImports, folding} from './folding';
import {
  IconImage,
  IconSplit,
  IconText,
  Pause,
  PlayArrow,
  SkipNext,
  SkipPrevious,
} from './icons';
import {parseFiddle} from './parseFiddle';
import {EditorTheme, SyntaxHighlightStyle} from './themes';
import {TransformError, compileScene, transform} from './transformer';
import {useSubscribableValue} from './useSubscribable';
import styles from './styles.module.css';

export interface FiddleProps {
  className?: string;
  /**
   * The source code of the fiddle. Provided by the remark plugin that turns
   * ```tsx editor fences into this component.
   */
  code: string;
  /**
   * The statically highlighted code block for the fence. Rendered until
   * CodeMirror takes over, and in code-only mode.
   */
  children?: React.ReactNode;
  mode?: 'code' | 'editor' | 'preview';
  ratio?: string;
}

function highlight(sizePixels = 4) {
  return [
    {
      boxShadow: '0 0 0px 0 #ccc inset',
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    },
    {
      boxShadow: `0 0 0px ${sizePixels}px #ccc inset`,
      easing: 'cubic-bezier(0.32, 0, 0.67, 0)',
    },
    {boxShadow: '0 0 0px 0 #ccc inset'},
  ];
}

export default function Fiddle({
  code,
  children,
  className,
  mode: initialMode = 'editor',
  ratio = '4',
}: FiddleProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const editorView = useRef<EditorView | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(initialMode);
  const pathname = usePathname() ?? 'fiddle';

  const [error, setError] = useState<string | null>(null);
  const duration = useSubscribableValue(player?.onDurationChanged);
  const frame = useSubscribableValue(player?.onFrameChanged);
  const state = useSubscribableValue(player?.onStateChanged);

  const [doc, setDoc] = useState<Text | null>(null);
  const [lastDoc, setLastDoc] = useState<Text | null>(null);

  const parsedRatio = useMemo(() => {
    if (ratio.includes('/')) {
      const parts = ratio.split('/');
      const calculated = parseFloat(parts[0]) / parseFloat(parts[1]);
      if (!isNaN(calculated)) {
        return calculated;
      }
    }
    const value = parseFloat(ratio);
    return isNaN(value) ? 4 : value;
  }, [ratio]);

  const update = async (newDoc: Text, animate = true) => {
    if (!previewRef.current) return false;
    const borrowed = await borrowPlayer(
      setPlayer,
      previewRef.current,
      parsedRatio,
    );
    try {
      const scene = await compileScene(newDoc.sliceString(0), pathname);
      updatePlayer(scene);
      setLastDoc(newDoc);
      if (animate && !lastDoc?.eq(newDoc)) {
        previewRef.current.animate(highlight(), {duration: 300});
      }
      return true;
    } catch (e: any) {
      if (e instanceof TransformError && editorView.current) {
        underlineErrors(editorView.current, e.errors, e.message);
      }
      setError(e.message);
      borrowed?.togglePlayback(false);
      return false;
    }
  };

  const switchState = async (id: number) => {
    setSnippetId(id);
    if (!editorView.current) return;
    const isFolded = areImportsFolded(editorView.current.state);
    editorView.current.setState(snippets[id].state);
    await update(snippets[id].state.doc);
    if (isFolded) {
      foldImports(editorView.current);
    }
  };

  const [snippetId, setSnippetId] = useState(0);
  const snippets = useMemo(
    () =>
      parseFiddle(code).map(snippet => ({
        name: snippet.name,
        state: EditorState.create({
          doc: Text.of(snippet.lines),
          extensions: [
            basicSetup,
            keymap.of([
              indentWithTab,
              {
                key: 'Mod-s',
                preventDefault: true,
                run: view => {
                  update(view.state.doc);
                  return true;
                },
              },
            ]),
            EditorView.updateListener.of(update => {
              setDoc(update.state.doc);
              if (update.docChanged) {
                setError(null);
                if (editorView.current) {
                  clearErrors(editorView.current);
                }
              }
            }),
            autocomplete(),
            folding(),
            errorExtension(),
            javascript({
              jsx: true,
              typescript: true,
            }),
            syntaxHighlighting(SyntaxHighlightStyle),
            EditorTheme,
          ],
        }),
      })),
    [code],
  );

  if (typeof window === 'undefined') {
    // Validate the snippets during server-side rendering so broken examples
    // fail the build instead of the reader's browser.
    snippets.forEach(snippet => {
      transform(snippet.state.doc.sliceString(0), pathname);
    });
  }

  useEffect(() => {
    const view = new EditorView({
      parent: editorRef.current!,
      state: snippets[snippetId].state,
    });
    editorView.current = view;
    foldImports(view);

    if (previewRef.current) {
      tryBorrowPlayer(setPlayer, previewRef.current, parsedRatio).then(
        async borrowed => {
          if (borrowed) {
            const success = await update(snippets[snippetId].state.doc, false);
            if (success && mode !== 'code') {
              borrowed.togglePlayback(true);
            }
          }
        },
      );
    }

    return () => {
      disposePlayer(setPlayer);
      view.destroy();
      if (editorView.current === view) {
        editorView.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasChangedSinceLastUpdate = !!lastDoc && !!doc && !doc.eq(lastDoc);
  const hasChanged =
    (!!doc && !doc.eq(snippets[snippetId].state.doc)) ||
    hasChangedSinceLastUpdate;

  return (
    <div
      className={clsx(styles.root, className, {
        [styles.codeOnly]: mode === 'code',
        [styles.previewOnly]: mode === 'preview',
      })}
    >
      <div className={styles.layoutControl}>
        <button
          className={clsx(styles.icon, mode === 'code' && styles.active)}
          onClick={() => {
            setMode('code');
            player?.togglePlayback(false);
          }}
          title="Source code"
        >
          <IconText />
        </button>
        <button
          className={clsx(styles.icon, mode === 'editor' && styles.active)}
          onClick={() => setMode('editor')}
          title="Editor with preview"
        >
          <IconSplit />
        </button>
        <button
          className={clsx(styles.icon, mode === 'preview' && styles.active)}
          onClick={() => setMode('preview')}
          title="Preview"
        >
          <IconImage />
        </button>
      </div>
      <div
        className={styles.preview}
        style={{aspectRatio: ratio}}
        ref={previewRef}
      >
        {!player && <div>Press play to preview the animation</div>}
      </div>
      {!!duration && duration > 0 && (
        <div
          className={styles.progress}
          style={{width: player ? `${((frame ?? 0) / duration) * 100}%` : 0}}
        />
      )}
      <div className={styles.controls}>
        <div className={styles.section}>
          {hasChangedSinceLastUpdate && (
            <button
              onClick={() => {
                if (editorView.current) {
                  update(editorView.current.state.doc);
                }
              }}
              className={styles.button}
            >
              <kbd>CTRL</kbd>
              <kbd>S</kbd>
              <small>Update preview</small>
            </button>
          )}
        </div>
        <div
          className={clsx(
            styles.section,
            duration === 0 && player && styles.disabled,
          )}
        >
          <button
            className={styles.icon}
            onClick={() => player?.requestPreviousFrame()}
          >
            <SkipPrevious />
          </button>
          <button
            className={styles.icon}
            onClick={async () => {
              if (!editorView.current || !previewRef.current) return;
              if (!player) {
                const borrowed = await borrowPlayer(
                  setPlayer,
                  previewRef.current,
                  parsedRatio,
                );
                const success = await update(editorView.current.state.doc);
                if (success) {
                  borrowed.togglePlayback(true);
                }
              } else {
                let success = true;
                if (!lastDoc) {
                  success = await update(editorView.current.state.doc);
                }
                if (success) {
                  player.togglePlayback();
                }
              }
            }}
          >
            {!player || (state?.paused ?? true) ? <PlayArrow /> : <Pause />}
          </button>
          <button
            className={styles.icon}
            onClick={() => player?.requestNextFrame()}
          >
            <SkipNext />
          </button>
        </div>
        <div className={styles.section}>
          {snippets.length === 1 && hasChanged && (
            <button className={styles.button} onClick={() => switchState(0)}>
              <small>Reset example</small>
            </button>
          )}
          {snippets.length > 1 && (
            <Dropdown
              className={styles.picker}
              value={hasChanged ? -1 : snippetId}
              onChange={switchState}
              options={snippets
                .map((snippet, index) => ({
                  value: index,
                  name: snippet.name,
                }))
                .concat(hasChanged ? [{value: -1, name: 'Custom'}] : [])}
            />
          )}
        </div>
      </div>
      {error && <pre className={styles.error}>{error}</pre>}
      <div className={styles.editor} ref={editorRef}>
        <div className={styles.source}>{children}</div>
      </div>
    </div>
  );
}
