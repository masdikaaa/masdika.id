import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Global hook to ensure iframes only point to YouTube.
// Added globally to prevent race conditions during concurrent renders.
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const element = node as Element;
    const src = element.getAttribute('src') || '';
    if (!src.startsWith('https://www.youtube.com/embed/')) {
      node.parentNode?.removeChild(node);
    }
  }
});

export function renderMarkdown(md: string): string {
  if (!md) return '';

  // Process custom admonitions before parsing
  let processedMd = md
    .replace(/:::(\w+)\n([\s\S]*?)\n:::/g, (match, type, content) => {
      let titleColor = 'text-yellow-500';
      let borderClass = 'border-l-yellow-500 border-yellow-500/20';
      let bgClass = 'bg-yellow-500/5';
      let title = 'Important';
      let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
      
      if (type === 'danger') {
        titleColor = 'text-red-500';
        borderClass = 'border-l-red-500 border-red-500/20';
        bgClass = 'bg-red-500/5';
        title = 'Danger';
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';
      } else if (type === 'info') {
        titleColor = 'text-cyan-500';
        borderClass = 'border-l-cyan-500 border-cyan-500/20';
        bgClass = 'bg-cyan-500/5';
        title = 'Info';
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
      } else if (type === 'tip') {
        titleColor = 'text-green-500';
        borderClass = 'border-l-green-500 border-green-500/20';
        bgClass = 'bg-green-500/5';
        title = 'Tip';
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';
      }
      return `<div class="my-6 border-l-4 border-y border-r rounded-r-lg p-4 ${borderClass} ${bgClass}"><div class="flex items-center text-base mb-2 font-bold tracking-wide ${titleColor}">${icon} ${title}</div><div class="text-[0.95rem] text-zinc-300 leading-relaxed">${content.replace(/\n/g, '<br/>')}</div></div>\n`;
    })
    .replace(/> \[!IMPORTANT\]\n> (.*)/g, '<div class="my-6 border-l-4 border-y border-r rounded-r-lg p-4 border-l-yellow-500 border-yellow-500/20 bg-yellow-500/5"><div class="flex items-center text-base mb-2 font-bold tracking-wide text-yellow-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Important</div><div class="text-[0.95rem] text-zinc-300 leading-relaxed">$1</div></div>\n')
    .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
    // YouTube links (matches raw, <link>, or [link](link))
    .replace(/^(?:<)?(?:\[.*?\]\()?https?:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s>)]*(?:\))?(?:>)?$/gm, '<div class="w-full aspect-video my-8 rounded-xl overflow-hidden shadow-2xl border border-white/10"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/$1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>');

  try {
    let html = marked.parse(processedMd, { async: false, breaks: true }) as string;
    
    // Add IDs to headings for Table of Contents
    html = html.replace(/<h([1-6])(.*?)>(.*?)<\/h\1>/g, (match, level, attrs, textContent) => {
      if (attrs.includes('id=')) return match;
      const cleanText = textContent.replace(/<[^>]*>?/gm, '').trim();
      // Match the ID generation logic used in TOC parsing
      const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `<h${level}${attrs} id="${id}" class="scroll-mt-32">${textContent}</h${level}>`;
    });

    // Make tables beautiful and responsive globally
    html = html.replace(/<table[^>]*>/g, '<div class="w-full max-w-full overflow-x-auto pb-4"><table class="w-full min-w-[600px] !m-0" style="display: table !important; width: 100% !important; table-layout: auto !important;">');
    html = html.replace(/<\/table>/g, '</table></div>');
    html = html.replace(/<th([^>]*)>/g, '<th$1>');
    html = html.replace(/<td([^>]*)>/g, '<td$1>');
    
    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });
    
    return sanitizedHtml;
  } catch (error) {
    console.error("Markdown parsing error:", error);
    // Sanitize even on error to prevent XSS
    return DOMPurify.sanitize(processedMd);
  }
}
