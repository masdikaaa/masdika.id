"use client";

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';

const Editor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => mod.MDXEditor),
  { ssr: false }
);

export const MDXEditorWrapper = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => {
  return <Editor {...props} ref={ref} />;
});

MDXEditorWrapper.displayName = 'MDXEditorWrapper';
