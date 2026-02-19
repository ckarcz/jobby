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

    const cleanup = (): void => {
      clearTimeout(timeout);
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
    };

    const onData = (chunk: string): void => {
      data += chunk;
    };
    const onEnd = (): void => {
      cleanup();
      resolve(data.trim() || undefined);
    };
    const onError = (): void => {
      cleanup();
      resolve(undefined);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(data.trim() || undefined);
    }, timeoutMs);

    stream.setEncoding('utf8');
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}
