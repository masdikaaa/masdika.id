'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PlainTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
  isDark?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

function readEditableText(el: HTMLElement): string {
  if (el.childNodes.length === 1 && el.firstChild?.nodeName === 'BR') {
    return '';
  }
  const raw = (el.innerText ?? el.textContent ?? '').replace(/\r\n/g, '\n');
  if (raw === '\n' && el.innerHTML === '<br>') {
    return '';
  }
  return raw;
}

/**
 * Plain-text editable surface backed by a `contentEditable="plaintext-only"` div
 * rather than a native `<textarea>`, matching the rich-text ticket editor's DOM
 * model so browser `<textarea>` caret/compose overlay dots do not appear.
 */
export function PlainTextArea({
  value,
  onChange,
  placeholder,
  className,
  minHeightClass = 'min-h-[82px]',
  isDark = true,
  disabled = false,
  ariaLabel,
  onKeyDown,
}: PlainTextAreaProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || isComposingRef.current) return;
    const current = readEditableText(el);
    if (current !== value) {
      if (value === '') {
        el.innerHTML = '';
      } else {
        el.textContent = value;
      }
    }
  }, [value]);

  const syncFromDom = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = readEditableText(el);
    if (next === '' && el.innerHTML !== '') {
      el.innerHTML = '';
    }
    if (next !== value) {
      onChange(next);
    }
  };

  const handleInput = () => {
    if (isComposingRef.current) return;
    syncFromDom();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    syncFromDom();
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.target === outerRef.current || e.target === innerRef.current) {
      editorRef.current?.focus();
    }
  };

  return (
    <div
      ref={outerRef}
      onClick={handleContainerClick}
      className={cn(
        'border outline-none transition-colors focus-within:border-cyan-500 overflow-y-auto flex',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text',
        minHeightClass,
        className
      )}
    >
      <div ref={innerRef} className="relative w-full min-h-full">
        {!value && placeholder && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none select-none absolute inset-x-0 top-0 whitespace-pre-wrap break-words',
              isDark ? 'text-zinc-500' : 'text-slate-400'
            )}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel || placeholder}
          contentEditable={disabled ? false : 'plaintext-only'}
          suppressContentEditableWarning
          spellCheck={false}
          data-ms-editor="false"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={onKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            syncFromDom();
          }}
          className="w-full min-h-full outline-none whitespace-pre-wrap break-words caret-cyan-400"
        />
      </div>
    </div>
  );
}
