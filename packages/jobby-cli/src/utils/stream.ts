import type { Readable } from 'node:stream';

/**
 * Reads data from a stream if it's not a TTY (i.e., data is being piped in).
 * Returns the trimmed string or undefined if the stream is a TTY or times out.
 * @param stream - The readable stream to consume.
 * @param isTTY - Whether the stream is connected to a TTY. If true, returns undefined immediately.
 * @param timeoutMs - Maximum time in milliseconds to wait for data before resolving. Defaults to 100.
 * @returns The trimmed stream content, or undefined if the stream is a TTY, empty, or times out.
 */
export async function readFromStream(stream: Readable, isTTY: boolean | undefined, timeoutMs = 100): Promise<string | undefined> {
  if (isTTY) {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    let data = '';
    const timeout = setTimeout(() => {
      stream.removeAllListeners('data');
      stream.removeAllListeners('end');
      resolve(data.trim() || undefined);
    }, timeoutMs);

    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      data += chunk;
    });
    stream.on('end', () => {
      clearTimeout(timeout);
      resolve(data.trim() || undefined);
    });
    stream.on('error', () => {
      clearTimeout(timeout);
      resolve(undefined);
    });
  });
}
