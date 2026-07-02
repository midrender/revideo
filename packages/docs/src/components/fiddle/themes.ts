/* eslint-disable @typescript-eslint/naming-convention */
import {HighlightStyle} from '@codemirror/language';
import {EditorView} from '@codemirror/view';
import {tags} from '@lezer/highlight';

// All variables referenced here are defined on the fiddle root element in
// styles.module.css, with light/dark values keyed off the `.dark` class that
// next-themes sets on <html>.
export const SyntaxHighlightStyle = HighlightStyle.define([
  {tag: tags.comment, color: 'var(--hl-comment)'},
  {tag: tags.docComment, color: 'var(--hl-comment)'},
  {tag: tags.blockComment, color: 'var(--hl-comment)'},
  {tag: tags.keyword, color: 'var(--hl-keyword)'},
  {tag: tags.number, color: 'var(--hl-number)'},
  {tag: tags.inserted, color: 'var(--hl-number)'},
  {tag: tags.constant(tags.propertyName), color: 'var(--hl-constant)'},
  {tag: tags.attributeName, color: 'var(--hl-variable)'},
  {tag: tags.variableName, color: 'var(--hl-variable)'},
  {tag: tags.propertyName, color: 'var(--hl-variable)'},
  {tag: tags.deleted, color: 'var(--hl-string)'},
  {tag: tags.string, color: 'var(--hl-string)'},
  {tag: tags.attributeValue, color: 'var(--hl-string)'},
  {tag: tags.tagName, color: 'var(--hl-tag)'},
  {tag: tags.typeName, color: 'var(--hl-tag)'},
  {tag: tags.punctuation, color: 'var(--hl-punctuation)'},
  {tag: tags.operator, color: 'var(--hl-punctuation)'},
  {tag: tags.function(tags.variableName), color: 'var(--hl-function)'},
  {tag: tags.function(tags.propertyName), color: 'var(--hl-function)'},
  {tag: tags.className, color: 'var(--hl-class)'},
  {tag: tags.character, color: 'var(--hl-char)'},
]);

export const EditorTheme = EditorView.theme({
  '&': {
    fontSize: '0.875rem',
    lineHeight: '21.04px',
    fontFamily: 'var(--font-ibm-plex-mono), monospace',
    color: 'var(--hl-color)',
    backgroundColor: 'var(--hl-background)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--hl-color)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--hl-background)',
    color: 'var(--fiddle-muted-color)',
    borderRight: '1px solid var(--fiddle-border-color)',
  },
  '& .cm-lineNumbers .cm-gutterElement': {
    paddingLeft: 'var(--fiddle-pre-padding)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--fiddle-active-color)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-ibm-plex-mono), monospace',
    lineHeight: '1.5',
    paddingTop: 'var(--fiddle-pre-padding)',
    paddingBottom: 'var(--fiddle-pre-padding)',
  },
  '.cm-content': {
    padding: '0',
  },
  '& .cm-line': {
    paddingRight: 'var(--fiddle-pre-padding)',
  },
  '& .cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection':
    {
      backgroundColor: 'var(--fiddle-selection-color)',
    },
  '.cm-activeLine': {
    backgroundColor: 'var(--fiddle-active-color)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--fiddle-selection-color)',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--fiddle-selection-color)',
    borderColor: 'var(--fiddle-border-color)',
    color: 'inherit',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--fiddle-surface-color)',
    color: 'var(--hl-color)',
    border: '1px solid var(--fiddle-border-color)',
    padding: '2px 6px',
  },
});
