import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import Fiddle from './src/components/fiddle'

const docsComponents = getDocsMDXComponents()

export const useMDXComponents = components => ({
  ...docsComponents,
  // Interactive editor + revideo preview, emitted by remark-fiddle.mjs for
  // ```tsx editor fences.
  Fiddle,
  ...components
})
