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
                className={cn("w-full max-w-md rounded-2xl p-6 border shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("p-3 rounded-2xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                    <FaYoutube className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Insert YouTube Video</h3>
                    <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Paste your YouTube link below.</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>YouTube URL</label>
                  <input 
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleYoutubeSubmit();
                      if (e.key === 'Escape') setIsYoutubeModalOpen(false);
                    }}
                  />
                </div>
                
                <div className={cn("flex gap-3 justify-end pt-2 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                  <button
                    onClick={() => setIsYoutubeModalOpen(false)}
                    className={cn("px-5 py-2.5 font-semibold rounded-lg transition-colors border text-sm", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800/50" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleYoutubeSubmit}
                    className="px-5 py-2.5 font-semibold rounded-lg transition-colors bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-sm"
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
