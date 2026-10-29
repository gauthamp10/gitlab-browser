// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;?]*[A-Za-z]/g;
// GitLab collapsible-section markers, e.g. "section_start:1700000000:step_script[collapsed=true]\r"
const SECTION_PATTERN = /section_(?:start|end):\d+:[^\r\n]*\r/g;

/** Plain-text job log for the clipboard: no ANSI colour codes or section markers. */
export function toPlainLog(raw: string): string {
  return raw.replace(ANSI_PATTERN, '').replace(SECTION_PATTERN, '');
}

/** Copy text, returning whether it succeeded. */
export async function copyText(text: string): Promise<boolean> {
  // navigator.clipboard only exists in secure contexts (HTTPS or localhost);
  // fall back to execCommand when the app is served over plain HTTP.
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
