import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

/** Creates a configured TurndownService instance with custom rules for job descriptions. */
function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  });

  service.addRule('lineBreak', {
    filter: 'br',
    replacement: () => '<br>',
  });

  service.addRule('paragraph', {
    filter: 'p',
    replacement: (content) => '<br><br>' + content + '<br><br>',
  });

  service.addRule('heading', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = Number(node.nodeName.charAt(1));
      return '<br><br>' + '#'.repeat(level) + ' ' + content + '<br><br>';
    },
  });

  service.addRule('list', {
    filter: ['ul', 'ol'],
    replacement: (content, node) => {
      const parent = node.parentNode as Element | null;
      if (parent?.nodeName === 'LI' && parent.lastElementChild === node) {
        return '<br>' + content;
      }
      return '<br><br>' + content + '<br><br>';
    },
  });

  service.addRule('listItem', {
    filter: 'li',
    replacement: (rawContent, node, options) => {
      const trimmed = rawContent.replace(/^\s+/, '').replace(/\s+$/, '');
      let prefix: string = String(options.bulletListMarker) + ' ';
      const parent = node.parentNode as Element | null;
      if (parent?.nodeName === 'OL') {
        const start = parent.getAttribute('start');
        const index: number = Array.prototype.indexOf.call(parent.children, node);
        prefix = String(start ? Number(start) + index : index + 1) + '. ';
      }
      return prefix + trimmed + (node.nextSibling ? '<br>' : '');
    },
  });

  return service;
}

/** Module-level singleton for production use. */
const turndown = createTurndownService();

/**
 * Pre-processes HTML to fix oddities before markdown conversion.
 * Moves `<br>` tags from inside markdown-supported formatting elements
 * to after the closing tag, preserving their count.
 * See: https://github.com/mixmark-io/turndown/issues/253
 * @param html - The raw HTML string to pre-process.
 * @returns The pre-processed HTML string with `<br>` tags relocated.
 */
function preprocessHtml(html: string): string {
  const $ = cheerio.load(html);

  // Only HTML tags that have markdown equivalents
  const markdownSupportedTags = [
    'strong', 'b',        // Bold: **text**
    'em', 'i',           // Italic: *text*
    'code',              // Inline code: `text`
    's', 'strike', 'del' // Strikethrough: ~~text~~ (GitHub flavored)
  ];

  // Move <br> tags from inside inline formatting elements to after them
  markdownSupportedTags.forEach(tag => {
    $(tag).toArray().forEach(ele => {
      const $ele = $(ele);
      const brCount = $ele.find('br').length;
      if (brCount > 0) {
        $ele.find('br').remove();
        for (let i = 0; i < brCount; i++) {
          $ele.after('<br>');
        }
      }
    });
  });

  return $.html();
}

/**
 * Post-processes markdown output from turndown.
 * Turndown's internal join() inserts \n between nodes that we can't
 * override through rules, so we normalize those to `<br>` and clean up.
 * @param md - The raw markdown string from turndown.
 * @returns The cleaned markdown string with normalized `<br>` line breaks.
 */
function postProcessMarkdown(md: string): string {
  return md
    .replace(/\n/g, '<br>')
    .replace(/(<br>){3,}/g, '<br><br>')
    .replace(/^(<br>)+/, '')
    .replace(/(<br>)+$/, '');
}

/**
 * Converts HTML to Markdown, with pre-processing to fix common oddities.
 * Uses `<br>` tags for line breaks instead of newline characters.
 * @param html - The HTML string to convert.
 * @returns The converted markdown string using `<br>` for line breaks.
 */
export function htmlToMarkdown(html: string): string {
  return postProcessMarkdown(turndown.turndown(preprocessHtml(html)));
}
