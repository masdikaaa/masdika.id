"use client";

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MDXEditorWrapper } from './MDXEditorWrapper';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  imagePlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  InsertCodeBlock,
  MDXEditorMethods,
  Separator,
  CodeToggle,
  StrikeThroughSupSubToggles,
  HighlightToggle,
  ListsToggle,
  InsertImage,
  InsertAdmonition,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  frontmatterPlugin
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ImageIcon } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

interface EditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  onOpenMedia: (onSelect: (url: string) => void) => void;
}

export default function Editor({ markdown, onChange, onOpenMedia }: EditorProps) {
  const mdxRef = useRef<MDXEditorMethods>(null);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMedia = () => {
     onOpenMedia((url) => {
        mdxRef.current?.insertMarkdown(`\n![Gambar](${url})\n`);
     });
  };

  const handleYoutubeClick = () => {
    setYoutubeUrl('');
    setIsYoutubeModalOpen(true);
  };

  const handleYoutubeSubmit = () => {
    if (youtubeUrl && youtubeUrl.trim() !== '') {
       mdxRef.current?.insertMarkdown(`\n${youtubeUrl.trim()}\n`);
    }
    setIsYoutubeModalOpen(false);
  };

  return (
    <>
      <div className={cn("rounded-xl border min-w-0 max-w-full", isDark ? "mdx-custom-theme border-white/5 bg-black/40" : "border-slate-200 bg-white")}>
        <MDXEditorWrapper
          className={cn(isDark ? "dark-theme dark-editor" : "light-theme")}
          ref={mdxRef}
          markdown={markdown}
          onChange={onChange}
          contentEditableClassName={cn("prose prose-lg max-w-none p-4 min-h-[400px] outline-none", isDark ? "prose-invert" : "")}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            tablePlugin(),
            imagePlugin({ imagePreviewHandler: (src) => Promise.resolve(src) }),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'bash' }),
            codeMirrorPlugin({ 
              codeBlockLanguages: { 
                bash: 'Bash/Shell', 
                js: 'JavaScript', 
                ts: 'TypeScript', 
                php: 'PHP / Laravel', 
                css: 'CSS', 
                html: 'HTML', 
                json: 'JSON',
                yaml: 'YAML',
                dockerfile: 'Dockerfile',
                jenkinsfile: 'Jenkinsfile',
                go: 'Go',
                python: 'Python',
                rust: 'Rust',
                sql: 'SQL',
                xml: 'XML',
                markdown: 'Markdown',
                txt: 'TXT'
              } 
            }),
            directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
            diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: markdown }),
            frontmatterPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <DiffSourceToggleWrapper>
                  <div className={cn("flex flex-wrap items-center gap-1 w-full p-2 border-b", isDark ? "bg-[#0d1117] border-white/10" : "bg-slate-50 border-slate-200")}>
                    <UndoRedo />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <Separator />
                    <StrikeThroughSupSubToggles />
                    <HighlightToggle />
                    <Separator />
                    <ListsToggle />
                    <Separator />
                    <BlockTypeSelect />
                    <Separator />
                    <CreateLink />
                    <InsertImage />
                    <button 
                      onClick={handleMedia}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors", isDark ? "!text-white hover:bg-white/10" : "!text-slate-700 hover:bg-slate-200")}
                      title="Media Library"
                    >
                      <ImageIcon className="w-4 h-4" /> Add Media
                    </button>
                    <button 
                      onClick={handleYoutubeClick}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors", isDark ? "!text-white hover:bg-white/10" : "!text-slate-700 hover:bg-slate-200")}
                      title="Insert YouTube Video"
                    >
                      <FaYoutube className="w-4 h-4" /> YouTube
                    </button>
                    <Separator />
                    <InsertTable />
                    <InsertThematicBreak />
                    <Separator />
                    <InsertCodeBlock />
                    <InsertAdmonition />
                  </div>
                </DiffSourceToggleWrapper>
              )
            })
          ]}
        />
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isYoutubeModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-[#0f172a] rounded-3xl p-6 border border-cyan-500/20"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("p-3 rounded-2xl border", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                    <FaYoutube className={cn("w-6 h-6", isDark ? "text-white" : "text-slate-900")} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Insert YouTube Video</h3>
                    <p className="text-zinc-400 text-sm">Paste your YouTube link below.</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">YouTube URL</label>
                  <input 
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-5 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleYoutubeSubmit();
                      if (e.key === 'Escape') setIsYoutubeModalOpen(false);
                    }}
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={() => setIsYoutubeModalOpen(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleYoutubeSubmit}
                    className="px-6 py-3 font-bold rounded-xl transition-colors bg-cyan-500 hover:bg-cyan-600 text-[#011627]"
                  >
                    Insert Video
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
