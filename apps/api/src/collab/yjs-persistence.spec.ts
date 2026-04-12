import * as Y from 'yjs';

// The module under test — does not exist yet, tests should fail
import {
  bindState,
  writeState,
  setupDebouncedPersistence,
  flushAllDirtyDocs,
} from './yjs-persistence';

// Mock PrismaService — minimal interface matching what yjs-persistence needs
function createMockPrisma(cardData: {
  descriptionYjs: Buffer | null;
  descriptionText: string | null;
} | null = null) {
  return {
    card: {
      findUnique: jest.fn().mockResolvedValue(cardData),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('yjs-persistence', () => {
  describe('bindState', () => {
    it('loads existing descriptionYjs BYTEA into Y.Doc when card has stored state', async () => {
      // Create a source doc, populate it, encode its state
      const sourceDoc = new Y.Doc();
      const fragment = sourceDoc.getXmlFragment('description');
      const text = new Y.XmlText('Hello from stored state');
      fragment.insert(0, [text]);
      const encodedState = Buffer.from(Y.encodeStateAsUpdate(sourceDoc));

      const prisma = createMockPrisma({
        descriptionYjs: encodedState,
        descriptionText: 'Hello from stored state',
      });

      const ydoc = new Y.Doc();
      await bindState('card:test-card-id', ydoc, prisma as any);

      // The doc should now have the content from the stored state
      const loadedFragment = ydoc.getXmlFragment('description');
      expect(loadedFragment.toJSON()).toBe('<description><undefined>Hello from stored state</undefined></description>');

      expect(prisma.card.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-card-id' },
        select: { descriptionYjs: true, descriptionText: true },
      });
    });

    it('creates Y.Doc from descriptionText when descriptionYjs is null (D-15 migration)', async () => {
      const prisma = createMockPrisma({
        descriptionYjs: null,
        descriptionText: 'Legacy plaintext description',
      });

      const ydoc = new Y.Doc();
      await bindState('card:migrate-card-id', ydoc, prisma as any);

      // The doc should have the plaintext content migrated to XmlFragment
      const fragment = ydoc.getXmlFragment('description');
      const json = fragment.toJSON();
      expect(json).toContain('Legacy plaintext description');
    });

    it('handles card with no description data (both null)', async () => {
      const prisma = createMockPrisma({
        descriptionYjs: null,
        descriptionText: null,
      });

      const ydoc = new Y.Doc();
      await bindState('card:empty-card-id', ydoc, prisma as any);

      // Doc should remain empty
      const fragment = ydoc.getXmlFragment('description');
      expect(fragment.length).toBe(0);
    });

    it('handles non-existent card gracefully', async () => {
      const prisma = createMockPrisma(null);

      const ydoc = new Y.Doc();
      // Should not throw
      await bindState('card:nonexistent-id', ydoc, prisma as any);

      const fragment = ydoc.getXmlFragment('description');
      expect(fragment.length).toBe(0);
    });

    it('validates cardId format from docName (T-03-02 threat mitigation)', async () => {
      const prisma = createMockPrisma(null);
      const ydoc = new Y.Doc();

      // Invalid docName format should not crash
      await bindState('invalid-format', ydoc, prisma as any);
      expect(prisma.card.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('writeState', () => {
    it('encodes Y.Doc state and saves to descriptionYjs BYTEA column', async () => {
      const prisma = createMockPrisma();
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment('description');
      const text = new Y.XmlText('Updated content');
      fragment.insert(0, [text]);

      await writeState('card:write-card-id', ydoc, prisma as any);

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'write-card-id' },
        data: expect.objectContaining({
          descriptionYjs: expect.any(Buffer),
          descriptionText: expect.any(String),
        }),
      });

      // Verify the BYTEA data is valid Y.Doc state
      const savedData = prisma.card.update.mock.calls[0][0].data;
      const verifyDoc = new Y.Doc();
      Y.applyUpdate(verifyDoc, new Uint8Array(savedData.descriptionYjs));
      const verifyFragment = verifyDoc.getXmlFragment('description');
      expect(verifyFragment.toJSON()).toContain('Updated content');
    });

    it('extracts plaintext from Y.XmlFragment and saves to descriptionText (D-19)', async () => {
      const prisma = createMockPrisma();
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment('description');
      const text = new Y.XmlText('Plaintext extraction test');
      fragment.insert(0, [text]);

      await writeState('card:plaintext-card-id', ydoc, prisma as any);

      const savedData = prisma.card.update.mock.calls[0][0].data;
      expect(savedData.descriptionText).toContain('Plaintext extraction test');
    });

    it('validates cardId before writing (T-03-02 threat mitigation)', async () => {
      const prisma = createMockPrisma();
      const ydoc = new Y.Doc();

      await writeState('invalid-format', ydoc, prisma as any);
      expect(prisma.card.update).not.toHaveBeenCalled();
    });
  });

  describe('setupDebouncedPersistence', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      flushAllDirtyDocs();
    });

    it('fires persistence ~30s after last update (D-18)', async () => {
      const prisma = createMockPrisma();
      const ydoc = new Y.Doc();

      setupDebouncedPersistence('card:debounce-card-id', ydoc, prisma as any);

      // Trigger an update on the doc
      const fragment = ydoc.getXmlFragment('description');
      const text = new Y.XmlText('debounce test');
      fragment.insert(0, [text]);

      // Should NOT have persisted immediately
      expect(prisma.card.update).not.toHaveBeenCalled();

      // Advance timers by 30 seconds
      jest.advanceTimersByTime(30_000);

      // Give microtasks time to complete
      await Promise.resolve();

      // Should have persisted
      expect(prisma.card.update).toHaveBeenCalledTimes(1);
    });

    it('resets timer on subsequent updates', async () => {
      const prisma = createMockPrisma();
      const ydoc = new Y.Doc();

      setupDebouncedPersistence('card:reset-card-id', ydoc, prisma as any);

      // First update
      const fragment = ydoc.getXmlFragment('description');
      fragment.insert(0, [new Y.XmlText('first')]);

      // Advance 20 seconds (< 30s threshold)
      jest.advanceTimersByTime(20_000);
      expect(prisma.card.update).not.toHaveBeenCalled();

      // Second update — should reset the timer
      fragment.insert(1, [new Y.XmlText(' second')]);

      // Advance another 20 seconds (only 20s since last update, < 30s)
      jest.advanceTimersByTime(20_000);
      expect(prisma.card.update).not.toHaveBeenCalled();

      // Advance the remaining 10 seconds
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();

      expect(prisma.card.update).toHaveBeenCalledTimes(1);
    });
  });
});
