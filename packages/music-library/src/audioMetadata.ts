import type { AudioFormat } from '@lavender/shared';

/** Metadata read from an audio file before it is added to the library. */
export interface ParsedAudioMetadata {
  format: AudioFormat;
  mimeType: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  /** 0 when the container does not expose a duration cheaply. */
  durationSec: number;
  /** Small embedded cover as a data URL; omitted when absent or too large. */
  artworkDataUrl?: string;
}

const MAX_ARTWORK_BYTES = 400_000;

const FORMAT_MIME: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  unknown: 'audio/*',
};

export function formatFromFileName(name: string): AudioFormat {
  const extension = name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'mp3':
      return 'mp3';
    case 'm4a':
    case 'mp4':
      return 'm4a';
    case 'aac':
      return 'aac';
    case 'wav':
    case 'wave':
      return 'wav';
    case 'flac':
      return 'flac';
    default:
      return 'unknown';
  }
}

export function mimeTypeForFormat(format: AudioFormat): string {
  return FORMAT_MIME[format];
}

/**
 * Reads the tags browsers and iOS players do not expose to JavaScript.
 *
 * Supports the common containers the app accepts: ID3v2 tags in MP3/AAC files,
 * MP4/M4A `ilst` atoms, FLAC Vorbis comments and PICTURE blocks, plus WAV/FLAC
 * duration from their headers. Parsing is defensive: an unreadable file yields
 * whatever was decoded before the failure, never an exception.
 */
export function parseAudioMetadata(
  bytes: Uint8Array,
  fileName: string,
  fallbackMimeType?: string,
): ParsedAudioMetadata {
  const format = formatFromFileName(fileName);
  const metadata: ParsedAudioMetadata = {
    format,
    mimeType: fallbackMimeType || FORMAT_MIME[format],
    durationSec: 0,
  };

  try {
    if (format === 'mp3' || format === 'aac' || looksLikeId3(bytes)) {
      Object.assign(metadata, parseId3(bytes));
    } else if (format === 'm4a') {
      Object.assign(metadata, parseMp4(bytes));
    } else if (format === 'flac' || looksLikeFlac(bytes)) {
      Object.assign(metadata, parseFlac(bytes));
    }
    if (format === 'wav' || looksLikeWav(bytes)) {
      Object.assign(metadata, parseWav(bytes));
    }
  } catch {
    // Truncated or non-standard container: keep the safe defaults.
  }

  return metadata;
}

function looksLikeId3(bytes: Uint8Array): boolean {
  return bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
}

function looksLikeFlac(bytes: Uint8Array): boolean {
  return bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43;
}

function looksLikeWav(bytes: Uint8Array): boolean {
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
}

/* ------------------------------------------------------------------ ID3v2 */

function syncSafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) & 0x7f) * 0x200000 +
    ((bytes[offset + 1] ?? 0) & 0x7f) * 0x4000 +
    ((bytes[offset + 2] ?? 0) & 0x7f) * 0x80 +
    ((bytes[offset + 3] ?? 0) & 0x7f)
  );
}

function decodeText(bytes: Uint8Array, encoding: number): string {
  if (encoding === 1 || encoding === 2) {
    let start = 0;
    let littleEndian = encoding === 1;
    if (encoding === 1 && bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        littleEndian = true;
        start = 2;
      } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        littleEndian = false;
        start = 2;
      }
    }
    let out = '';
    for (let index = start; index + 1 < bytes.length; index += 2) {
      const code = littleEndian
        ? (bytes[index] ?? 0) | ((bytes[index + 1] ?? 0) << 8)
        : ((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0);
      if (code === 0) break;
      out += String.fromCharCode(code);
    }
    return out.trim();
  }
  const decoder = encoding === 3 ? new TextDecoder('utf-8') : new TextDecoder('latin1');
  return decoder.decode(bytes).replace(/\0+$/, '').trim();
}

/** Finds the end of a null-terminated string for the frame's text encoding. */
function findStringEnd(bytes: Uint8Array, start: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    for (let index = start; index + 1 < bytes.length; index += 2) {
      if (bytes[index] === 0 && bytes[index + 1] === 0) return index;
    }
    return bytes.length;
  }
  for (let index = start; index < bytes.length; index += 1) {
    if (bytes[index] === 0) return index;
  }
  return bytes.length;
}

function parseId3(bytes: Uint8Array): Partial<ParsedAudioMetadata> {
  if (!looksLikeId3(bytes) || bytes.length < 10) return {};
  const major = bytes[3] ?? 0;
  const tagSize = syncSafeInt(bytes, 6);
  const end = Math.min(bytes.length, 10 + tagSize);
  const result: Partial<ParsedAudioMetadata> = {};

  if (major === 2) return result;
  const frameHeaderSize = major === 4 ? 10 : 10;
  let offset = 10;

  while (offset + frameHeaderSize <= end) {
    const id = String.fromCharCode(
      bytes[offset] ?? 0,
      bytes[offset + 1] ?? 0,
      bytes[offset + 2] ?? 0,
      bytes[offset + 3] ?? 0,
    );
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size =
      major === 4
        ? syncSafeInt(bytes, offset + 4)
        : ((bytes[offset + 4] ?? 0) << 24) |
          ((bytes[offset + 5] ?? 0) << 16) |
          ((bytes[offset + 6] ?? 0) << 8) |
          (bytes[offset + 7] ?? 0);
    const frameStart = offset + frameHeaderSize;
    const frameEnd = frameStart + size;
    if (size <= 0 || frameEnd > bytes.length) break;
    const frame = bytes.subarray(frameStart, frameEnd);
    offset = frameEnd;

    switch (id) {
      case 'TIT2':
        result.title = decodeText(frame.subarray(1), frame[0] ?? 0) || undefined;
        break;
      case 'TPE1':
        result.artist = decodeText(frame.subarray(1), frame[0] ?? 0) || undefined;
        break;
      case 'TALB':
        result.album = decodeText(frame.subarray(1), frame[0] ?? 0) || undefined;
        break;
      case 'TYER':
      case 'TDRC': {
        const year = Number.parseInt(decodeText(frame.subarray(1), frame[0] ?? 0), 10);
        if (Number.isFinite(year)) result.year = year;
        break;
      }
      case 'APIC': {
        const encoding = frame[0] ?? 0;
        const mimeEnd = findStringEnd(frame, 1, 0);
        const mime = new TextDecoder('latin1').decode(frame.subarray(1, mimeEnd)) || 'image/jpeg';
        const afterMime = mimeEnd + 1;
        const descriptionEnd = findStringEnd(frame, afterMime + 1, encoding);
        const data = frame.subarray(descriptionEnd + 1);
        result.artworkDataUrl = toDataUrl(data, mime);
        break;
      }
      default:
        break;
    }
  }

  return result;
}

/* ------------------------------------------------------------------- MP4 */

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function atomType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

/** Walks a box list, calling back for each child box. */
function walkAtoms(
  bytes: Uint8Array,
  start: number,
  end: number,
  visit: (type: string, payloadStart: number, payloadEnd: number) => void,
): void {
  let offset = start;
  while (offset + 8 <= end) {
    let size = readUint32(bytes, offset);
    const type = atomType(bytes, offset + 4);
    let header = 8;
    if (size === 1) {
      // 64-bit box size.
      const high = readUint32(bytes, offset + 8);
      const low = readUint32(bytes, offset + 12);
      size = high * 0x100000000 + low;
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header) break;
    visit(type, offset + header, Math.min(offset + size, end));
    offset += size;
  }
}

function parseMp4(bytes: Uint8Array): Partial<ParsedAudioMetadata> {
  const result: Partial<ParsedAudioMetadata> = {};
  walkAtoms(bytes, 0, bytes.length, (type, start, end) => {
    if (type !== 'moov') return;
    walkAtoms(bytes, start, end, (child, childStart, childEnd) => {
      if (child === 'mvhd') {
        const version = bytes[childStart] ?? 0;
        const timescale = readUint32(bytes, childStart + (version === 1 ? 20 : 12));
        const duration = readUint32(bytes, childStart + (version === 1 ? 24 : 16));
        if (timescale > 0) result.durationSec = duration / timescale;
      }
      if (child !== 'udta') return;
      walkAtoms(bytes, childStart, childEnd, (udtaChild, uStart, uEnd) => {
        if (udtaChild !== 'meta') return;
        // `meta` starts with a 4-byte version/flags header.
        walkAtoms(bytes, uStart + 4, uEnd, (metaChild, mStart, mEnd) => {
          if (metaChild !== 'ilst') return;
          walkAtoms(bytes, mStart, mEnd, (item, itemStart, itemEnd) => {
            walkAtoms(bytes, itemStart, itemEnd, (dataType, dStart, dEnd) => {
              if (dataType !== 'data') return;
              const payload = bytes.subarray(dStart + 8, dEnd);
              const value = new TextDecoder('utf-8').decode(payload).trim();
              switch (item) {
                case '©nam':
                  result.title = value || undefined;
                  break;
                case '©ART':
                case 'aART':
                  result.artist = value || undefined;
                  break;
                case '©alb':
                  result.album = value || undefined;
                  break;
                case '©day': {
                  const year = Number.parseInt(value.slice(0, 4), 10);
                  if (Number.isFinite(year)) result.year = year;
                  break;
                }
                case 'covr': {
                  const kind = bytes[dStart + 1] === 0x0d ? 'image/jpeg' : 'image/png';
                  result.artworkDataUrl = toDataUrl(payload, kind);
                  break;
                }
                default:
                  break;
              }
            });
          });
        });
      });
    });
  });
  return result;
}

/* ------------------------------------------------------------------ FLAC */

function parseFlac(bytes: Uint8Array): Partial<ParsedAudioMetadata> {
  const result: Partial<ParsedAudioMetadata> = {};
  let offset = 4;
  let last = false;

  while (!last && offset + 4 <= bytes.length) {
    const header = bytes[offset] ?? 0;
    last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const length = ((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const start = offset + 4;
    const end = Math.min(start + length, bytes.length);

    if (type === 0 && length >= 18) {
      const sampleRate = ((bytes[start + 10] ?? 0) << 12) | ((bytes[start + 11] ?? 0) << 4) | ((bytes[start + 12] ?? 0) >> 4);
      const totalSamples =
        ((bytes[start + 13] ?? 0) & 0x0f) * 0x100000000 +
        (bytes[start + 14] ?? 0) * 0x1000000 +
        (bytes[start + 15] ?? 0) * 0x10000 +
        (bytes[start + 16] ?? 0) * 0x100 +
        (bytes[start + 17] ?? 0);
      if (sampleRate > 0) result.durationSec = totalSamples / sampleRate;
    }

    if (type === 4) {
      let cursor = start;
      const vendorLength = (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
      cursor += 4 + vendorLength;
      const count =
        (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
      cursor += 4;
      const decoder = new TextDecoder('utf-8');
      for (let index = 0; index < count && cursor + 4 <= end; index += 1) {
        const size =
          (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
        cursor += 4;
        const entry = decoder.decode(bytes.subarray(cursor, cursor + size));
        cursor += size;
        const split = entry.indexOf('=');
        if (split < 0) continue;
        const key = entry.slice(0, split).toUpperCase();
        const value = entry.slice(split + 1);
        if (key === 'TITLE') result.title = value;
        if (key === 'ARTIST') result.artist = value;
        if (key === 'ALBUM') result.album = value;
        if (key === 'DATE') {
          const year = Number.parseInt(value.slice(0, 4), 10);
          if (Number.isFinite(year)) result.year = year;
        }
      }
    }

    if (type === 6) {
      let cursor = start + 4;
      const mimeLength = (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
      const mime = new TextDecoder('latin1').decode(bytes.subarray(cursor + 4, cursor + 4 + mimeLength));
      cursor += 4 + mimeLength;
      const descriptionLength =
        (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
      cursor += 4 + descriptionLength + 16; // description + width/height/depth/colors
      const dataLength =
        (bytes[cursor] ?? 0) | ((bytes[cursor + 1] ?? 0) << 8) | ((bytes[cursor + 2] ?? 0) << 16) | ((bytes[cursor + 3] ?? 0) << 24);
      const data = bytes.subarray(cursor + 4, cursor + 4 + dataLength);
      result.artworkDataUrl = toDataUrl(data, mime || 'image/jpeg');
    }

    offset = end;
  }

  return result;
}

/* ------------------------------------------------------------------- WAV */

function parseWav(bytes: Uint8Array): Partial<ParsedAudioMetadata> {
  const result: Partial<ParsedAudioMetadata> = {};
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= bytes.length) {
    const chunkId = atomType(bytes, offset);
    const size = (bytes[offset + 4] ?? 0) | ((bytes[offset + 5] ?? 0) << 8) | ((bytes[offset + 6] ?? 0) << 16) | ((bytes[offset + 7] ?? 0) << 24);
    if (chunkId === 'fmt ') {
      byteRate =
        (bytes[offset + 16] ?? 0) |
        ((bytes[offset + 17] ?? 0) << 8) |
        ((bytes[offset + 18] ?? 0) << 16) |
        ((bytes[offset + 19] ?? 0) << 24);
    }
    if (chunkId === 'data' && byteRate > 0) {
      result.durationSec = size / byteRate;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  return result;
}

/* ----------------------------------------------------------------- utils */

function toDataUrl(bytes: Uint8Array, mime: string): string | undefined {
  if (bytes.length === 0 || bytes.length > MAX_ARTWORK_BYTES) return undefined;
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
