import * as Y from 'yjs';
import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('YjsPersistence');

/**
 * UUID v4 regex for cardId validation (T-03-02 threat mitigation).
 * Prevents injection of arbitrary strings into DB queries.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse cardId from y-websocket docName.
 * Format: `card:{uuid}`
 * Returns null if format is invalid or cardId is not a UUID.
 */
function parseCardId(docName: string): string | null {
  if (!docName.startsWith('card:')) return null;
  const cardId = docName.slice(5);
  if (!UUID_RE.test(cardId)) return null;
  return cardId;
}

/**
 * Extract plaintext from a Y.XmlFragment for the descriptionText fallback.
 * Walks the XML tree and concatenates all text content.
 */
function extractPlaintext(fragment: Y.XmlFragment): string {
  let text = '';
  for (let i = 0; i < fragment.length; i++) {
    const item = fragment.get(i);
    if (item instanceof Y.XmlText) {
      text += item.toString();
    } else if (item instanceof Y.XmlElement) {
      // Recurse into elements
      text += extractPlaintextFromElement(item);
    }
  }
  return text;
}

function extractPlaintextFromElement(element: Y.XmlElement): string {
  let text = '';
  for (let i = 0; i < element.length; i++) {
    const item = element.get(i);
    if (item instanceof Y.XmlText) {
      text += item.toString();
    } else if (item instanceof Y.XmlElement) {
      text += extractPlaintextFromElement(item);
    }
  }
  return text;
}

/**
 * Load persisted Yjs document state from PostgreSQL into a Y.Doc.
 *
 * - If `descriptionYjs` (BYTEA) exists: apply the stored update.
 * - If only `descriptionText` exists (D-15 migration from Phase 2):
 *   create a Y.Doc with the text in an XmlFragment and apply to ydoc.
 * - If card not found or both null: leave ydoc empty.
 */
export async function bindState(
  docName: string,
  ydoc: Y.Doc,
  prisma: PrismaService,
): Promise<void> {
  const cardId = parseCardId(docName);
  if (!cardId) {
    logger.warn(`Invalid docName format: ${docName}`);
    return;
  }

  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { descriptionYjs: true, descriptionText: true },
    });

    if (!card) {
      logger.warn(`Card not found: ${cardId}`);
      return;
    }

    if (card.descriptionYjs) {
      // Load existing CRDT state
      Y.applyUpdate(ydoc, new Uint8Array(card.descriptionYjs));
      logger.debug(`Loaded Yjs state for card ${cardId}`);
    } else if (card.descriptionText) {
      // D-15 migration: convert plaintext to Yjs format
      const fragment = ydoc.getXmlFragment('description');
      const xmlText = new Y.XmlText(card.descriptionText);
      fragment.insert(0, [xmlText]);
      logger.log(`Migrated plaintext to Yjs for card ${cardId}`);
    }
  } catch (error) {
    logger.error(`Failed to bind state for ${cardId}: ${error}`);
  }
}

/**
 * Persist Y.Doc state to PostgreSQL.
 *
 * Writes both:
 * - `descriptionYjs`: Full CRDT state as BYTEA
 * - `descriptionText`: Extracted plaintext fallback (D-19)
 */
export async function writeState(
  docName: string,
  ydoc: Y.Doc,
  prisma: PrismaService,
): Promise<void> {
  const cardId = parseCardId(docName);
  if (!cardId) {
    logger.warn(`Invalid docName format for write: ${docName}`);
    return;
  }

  try {
    const state = Y.encodeStateAsUpdate(ydoc);
    const fragment = ydoc.getXmlFragment('description');
    const plaintext = extractPlaintext(fragment);

    await prisma.card.update({
      where: { id: cardId },
      data: {
        descriptionYjs: Buffer.from(state),
        descriptionText: plaintext,
      },
    });

    logger.debug(`Persisted Yjs state for card ${cardId}`);
  } catch (error) {
    logger.error(`Failed to write state for ${cardId}: ${error}`);
  }
}

// ── Debounced Persistence (D-18) ──────────────────────────────────────

const DEBOUNCE_MS = 30_000; // 30 seconds

/** Active debounce timers per docName */
const debounceTimers = new Map<string, NodeJS.Timeout>();

/** Track docs that have pending (dirty) changes */
const dirtyDocs = new Map<string, { ydoc: Y.Doc; prisma: PrismaService }>();

/**
 * Set up debounced persistence for a Yjs document.
 * On each `ydoc.on('update')`, resets a 30-second timer.
 * When the timer fires, writeState is called.
 */
export function setupDebouncedPersistence(
  docName: string,
  ydoc: Y.Doc,
  prisma: PrismaService,
): void {
  ydoc.on('update', () => {
    // Clear any existing timer
    const existing = debounceTimers.get(docName);
    if (existing) clearTimeout(existing);

    // Track as dirty
    dirtyDocs.set(docName, { ydoc, prisma });

    // Set new debounce timer
    const timer = setTimeout(() => {
      writeState(docName, ydoc, prisma);
      debounceTimers.delete(docName);
      dirtyDocs.delete(docName);
    }, DEBOUNCE_MS);

    debounceTimers.set(docName, timer);
  });
}

/**
 * Flush all dirty documents immediately.
 * Called on SIGTERM/SIGINT to ensure no data is lost.
 */
export function flushAllDirtyDocs(): void {
  for (const [docName, timer] of debounceTimers.entries()) {
    clearTimeout(timer);
    debounceTimers.delete(docName);
  }

  for (const [docName, { ydoc, prisma }] of dirtyDocs.entries()) {
    // Fire-and-forget — process is shutting down
    writeState(docName, ydoc, prisma).catch((err) =>
      logger.error(`Failed to flush ${docName}: ${err}`),
    );
    dirtyDocs.delete(docName);
  }
}
