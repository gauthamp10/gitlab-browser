import { useState, useEffect } from 'react';
import type { Highlighter } from 'shiki';

let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance;
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki');
      const h = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: [
          'typescript', 'tsx', 'javascript', 'jsx',
          'python', 'ruby', 'go', 'rust', 'java',
          'c', 'cpp', 'csharp', 'php', 'swift', 'kotlin', 'scala',
          'bash', 'shell', 'fish',
          'html', 'css', 'scss', 'less', 'vue', 'svelte',
          'json', 'yaml', 'toml', 'xml',
          'markdown', 'mdx', 'sql', 'graphql',
          'dockerfile', 'makefile', 'nginx', 'hcl',
          'r', 'lua', 'elixir', 'erlang', 'haskell', 'dart',
        ],
      });
      highlighterInstance = h;
      return h;
    })();
  }
  return highlighterPromise;
}

export function useShiki(
  code: string,
  lang: string,
  theme: 'github-dark' | 'github-light' = 'github-dark'
) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setHtml('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        try {
          const highlighted = highlighter.codeToHtml(code, { lang: lang || 'text', theme });
          setHtml(highlighted);
        } catch {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [code, lang, theme]);

  return { html, loading };
}
