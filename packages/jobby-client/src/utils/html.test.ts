import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from './html.js';

/** Tests for the HTML utility function that converts HTML to Markdown. */

describe('htmlToMarkdown - HTML to Markdown conversion', () => {
  it('should convert simple HTML to text', () => {
    expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
  });

  it('should convert bold tags to markdown', () => {
    expect(htmlToMarkdown('We need a <strong>talented</strong> engineer.')).toBe('We need a **talented** engineer.');
  });

  it('should convert italic tags to markdown', () => {
    expect(htmlToMarkdown('This is <em>important</em>.')).toBe('This is _important_.');
  });

  it('should separate paragraphs with br tags instead of newlines', () => {
    const result = htmlToMarkdown('<p>First paragraph</p><p>Second paragraph</p>');
    expect(result).not.toContain('\n');
    expect(result).toBe('First paragraph<br><br>Second paragraph');
  });

  it('should convert unordered lists with single-space bullet prefix', () => {
    const result = htmlToMarkdown('<ul><li>Item 1</li><li>Item 2</li></ul>');
    expect(result).toBe('- Item 1<br>- Item 2');
  });

  it('should convert links to markdown', () => {
    const result = htmlToMarkdown('<a href="https://example.com">Click here</a>');
    expect(result).toBe('[Click here](https://example.com)');
  });

  it('should convert headings to markdown', () => {
    const result = htmlToMarkdown('<h2>Section Title</h2>');
    expect(result).toContain('## Section Title');
  });

  it('should handle empty string', () => {
    expect(htmlToMarkdown('')).toBe('');
  });

  it('should handle plain text without HTML', () => {
    expect(htmlToMarkdown('Plain text')).toBe('Plain text');
  });

  it('should move br tags from inside strong to after, preserving count', () => {
    const result = htmlToMarkdown('<strong>Desired Skills<br><br></strong>Next content');
    expect(result).toBe('**Desired Skills**<br><br>Next content');
  });

  it('should move single br from inside strong to after', () => {
    const result = htmlToMarkdown('<strong>Bold<br></strong> after');
    expect(result).toContain('**Bold**');
    expect(result).toContain('<br>');
  });

  it('should move br tags from inside em to after', () => {
    const result = htmlToMarkdown('<em>Italic<br></em> after');
    expect(result).toContain('_Italic_');
    expect(result).toContain('<br>');
  });

  it('should not affect strong/em without br tags', () => {
    expect(htmlToMarkdown('<strong>bold</strong>')).toBe('**bold**');
    expect(htmlToMarkdown('<em>italic</em>')).toBe('_italic_');
  });

  it('should never contain raw newlines in output', () => {
    const html = '<p>Line 1</p><p>Line 2</p><br><strong>Bold<br></strong>';
    const result = htmlToMarkdown(html);
    expect(result).not.toContain('\n');
  });

  it('should handle bold section headers followed by list items', () => {
    const html = '<strong>Skills<br><br></strong><ul><li>Python</li><li>Java</li></ul>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('**Skills**');
    expect(result).toContain('- Python<br>- Java');
    expect(result).not.toContain('-   ');
  });

  it('should convert ordered lists with numbered prefixes', () => {
    const result = htmlToMarkdown('<ol><li>First</li><li>Second</li><li>Third</li></ol>');
    expect(result).toContain('1. First');
    expect(result).toContain('2. Second');
    expect(result).toContain('3. Third');
  });

  it('should respect start attribute on ordered lists', () => {
    const result = htmlToMarkdown('<ol start="5"><li>Fifth</li><li>Sixth</li></ol>');
    expect(result).toContain('5. Fifth');
    expect(result).toContain('6. Sixth');
  });

  it('should handle nested lists inside list items', () => {
    const result = htmlToMarkdown('<ul><li>Parent<ul><li>Child 1</li><li>Child 2</li></ul></li></ul>');
    expect(result).toContain('Parent');
    expect(result).toContain('Child 1');
    expect(result).toContain('Child 2');
  });

  it('should handle HTML entities', () => {
    const result = htmlToMarkdown('Tom &amp; Jerry');
    expect(result).toContain('Tom & Jerry');
  });

  it('should convert inline code tags', () => {
    const result = htmlToMarkdown('Use <code>npm install</code> to set up');
    expect(result).toContain('`npm install`');
  });

  it('should handle strikethrough tags', () => {
    const result = htmlToMarkdown('This is <del>removed</del> text');
    expect(result).toContain('removed');
  });

  it('should handle multiple h levels', () => {
    const result = htmlToMarkdown('<h1>H1</h1><h3>H3</h3>');
    expect(result).toContain('# H1');
    expect(result).toContain('### H3');
  });

  it('should handle b tag same as strong', () => {
    expect(htmlToMarkdown('<b>bold</b>')).toBe('**bold**');
  });

  it('should handle i tag same as em', () => {
    expect(htmlToMarkdown('<i>italic</i>')).toBe('_italic_');
  });
});
