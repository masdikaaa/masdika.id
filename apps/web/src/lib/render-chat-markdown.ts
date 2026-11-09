import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Safe link handling for chat messages
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      // Strip dangerous protocols
      if (/^(javascript|data|vbscript):/i.test(href.trim())) {
        node.removeAttribute('href');
        return;
      }
      // External/internal links open safely in new tab
      if (/^https?:\/\//i.test(href) || href.startsWith('/')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      node.classList.add(
        'text-cyan-400',
        'hover:text-cyan-300',
        'underline',
        'decoration-cyan-500/30',
        'underline-offset-2',
        'font-medium',
        'transition-colors'
      );
    }
  });
}

// Custom Marked renderer for code blocks in chat
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang, escaped }) {
  const escapedText = escaped
    ? text
    : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeLang = (lang || '').replace(/[^a-zA-Z0-9_+-]/g, '').slice(0, 32);
  return `
    <div class="relative group my-3 rounded-lg bg-[#0d1117] border border-cyan-500/20 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-1 bg-[#011627] border-b border-cyan-500/20">
        <span class="text-[11px] text-cyan-400 font-mono">${safeLang || 'code'}</span>
      </div>
      <div class="overflow-x-auto p-3 text-xs scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
        <pre class="!m-0 !p-0 !bg-transparent"><code class="language-${safeLang} text-slate-200">${escapedText}</code></pre>
      </div>
    </div>
  `;
};

export function parseChatMarkdown(text: string): string {
  if (!text) return '';
  try {
    marked.setOptions({
      gfm: true,
      breaks: true,
      renderer,
    });
    const rawMarkup = marked.parse(text) as string;
    return DOMPurify.sanitize(rawMarkup, { ADD_ATTR: ['target', 'rel'] });
  } catch (err) {
    console.error('Failed to parse chat markdown:', err);
    return DOMPurify.sanitize(text);
  }
}
