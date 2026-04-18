import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mock useCloudValue ───────────────────────────────────────────────
// Each key gets its own in-memory store so tests can inspect saved values.

const stores: Record<string, { data: unknown; save: ReturnType<typeof vi.fn>; }> = {};

function getStore<T>(key: string, defaultValue: T) {
    if (!stores[key]) {
        stores[key] = {
            data: defaultValue,
            save: vi.fn((val: T) => { stores[key].data = val; }),
        };
    }
    return stores[key];
}

vi.mock('@/shared/hooks/useCloudValue', () => ({
    useCloudValue: <T,>(key: string, defaultValue: T) => {
        const store = getStore(key, defaultValue);
        return {
            data: store.data as T,
            save: store.save,
            saveWith: vi.fn(),
            clear: vi.fn(),
            isReady: true,
        };
    },
}));

// ── Mock lucide-react ───────────────────────────────────────────────
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>;
    // Replace all icon components with simple span renderers
    const mocked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(actual)) {
        if (typeof value === 'object' || typeof value === 'function') {
            mocked[key] = (props: Record<string, unknown>) =>
                React.createElement('svg', { 'data-testid': `icon-${key}`, ...props });
        } else {
            mocked[key] = value;
        }
    }
    return mocked;
});

// ── Import AFTER mocks ───────────────────────────────────────────────
import { TasksNotes, deriveTitle, formatNoteDate, type QuickNote } from '../HomeView';

// ─── Pure function tests ─────────────────────────────────────────────

describe('deriveTitle', () => {
    it('returns first line trimmed', () => {
        expect(deriveTitle('Hello World\nSecond line')).toBe('Hello World');
    });

    it('truncates to 40 chars with ellipsis', () => {
        const long = 'A'.repeat(50);
        expect(deriveTitle(long)).toBe('A'.repeat(40) + '…');
    });

    it('skips empty leading lines', () => {
        expect(deriveTitle('\n\n  Real title\nBody')).toBe('Real title');
    });

    it('returns empty string for all-whitespace content', () => {
        expect(deriveTitle('   \n  \n  ')).toBe('');
    });

    it('returns short content as-is', () => {
        expect(deriveTitle('Short')).toBe('Short');
    });
});

describe('formatNoteDate', () => {
    it('returns "À l\'instant" for just now', () => {
        expect(formatNoteDate(Date.now())).toBe("À l'instant");
    });

    it('returns minutes ago', () => {
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        expect(formatNoteDate(fiveMinAgo)).toBe('Il y a 5min');
    });

    it('returns hours ago', () => {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        expect(formatNoteDate(twoHoursAgo)).toBe('Il y a 2h');
    });

    it('returns days ago within a week', () => {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        expect(formatNoteDate(threeDaysAgo)).toBe('Il y a 3j');
    });

    it('returns formatted date for older entries', () => {
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const result = formatNoteDate(twoWeeksAgo);
        // Should be like "21 mars" — a day + short month
        expect(result).toMatch(/\d{1,2}\s+\w+/);
    });
});

// ─── Component tests ─────────────────────────────────────────────────

describe('TasksNotes — Notes tab', () => {
    beforeEach(() => {
        // Reset all stores between tests
        Object.keys(stores).forEach(k => delete stores[k]);
    });

    function renderAndSwitchToNotes() {
        render(<TasksNotes />);
        // Click the Notes tab
        const notesTab = screen.getByText(/Notes/);
        fireEvent.click(notesTab);
    }

    it('renders empty textarea and Enregistrer button on Notes tab', () => {
        renderAndSwitchToNotes();

        const textarea = screen.getByPlaceholderText('Écrire une note...');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue('');

        expect(screen.getByText('Enregistrer')).toBeInTheDocument();
    });

    it('does nothing when saving empty draft', async () => {
        renderAndSwitchToNotes();

        const saveBtn = screen.getByText('Enregistrer');
        await userEvent.click(saveBtn);

        const store = stores['med-pilot-quick-notes-v2'];
        // save should NOT have been called (or data remains empty)
        if (store) {
            expect(store.save).not.toHaveBeenCalled();
        }
    });

    it('creates a note when typing and clicking Enregistrer', async () => {
        renderAndSwitchToNotes();

        const textarea = screen.getByPlaceholderText('Écrire une note...');
        await userEvent.type(textarea, 'Ma première note');

        const saveBtn = screen.getByText('Enregistrer');
        await userEvent.click(saveBtn);

        const store = stores['med-pilot-quick-notes-v2'];
        expect(store.save).toHaveBeenCalled();

        const savedNotes = store.save.mock.calls[0][0] as QuickNote[];
        expect(savedNotes).toHaveLength(1);
        expect(savedNotes[0].title).toBe('Ma première note');
        expect(savedNotes[0].content).toBe('Ma première note');
    });

    it('shows the drawer toggle with note count', () => {
        // Pre-populate with notes
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Note A', content: 'Content A', updatedAt: Date.now() },
            { id: '2', title: 'Note B', content: 'Content B', updatedAt: Date.now() - 1000 },
        ]);

        renderAndSwitchToNotes();

        expect(screen.getByText('2 notes')).toBeInTheDocument();
    });

    it('toggles drawer open/closed', async () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Note A', content: 'Content A', updatedAt: Date.now() },
        ]);

        renderAndSwitchToNotes();

        // Drawer should be closed initially — note title not visible (hidden by max-h-0)
        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);

        // After click, drawer should be open — note title visible
        expect(screen.getByText('Note A')).toBeInTheDocument();
    });

    it('loads note into textarea when clicking on it in the drawer', async () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Note A', content: 'Full content of note A', updatedAt: Date.now() },
        ]);

        renderAndSwitchToNotes();

        // Open drawer
        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);

        // Click on the note
        const noteItem = screen.getByText('Note A');
        await userEvent.click(noteItem);

        // Textarea should now have the note content
        const textarea = screen.getByPlaceholderText('Modifier la note...');
        expect(textarea).toHaveValue('Full content of note A');

        // Button should say "Mettre à jour"
        expect(screen.getByText('Mettre à jour')).toBeInTheDocument();
    });

    it('shows Annuler button when editing and clears on click', async () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Note A', content: 'Content A', updatedAt: Date.now() },
        ]);

        renderAndSwitchToNotes();

        // Open drawer and click note
        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);
        await userEvent.click(screen.getByText('Note A'));

        // Annuler should be visible
        const cancelBtn = screen.getByText('Annuler');
        expect(cancelBtn).toBeInTheDocument();

        await userEvent.click(cancelBtn);

        // Textarea should be cleared, placeholder back to "Écrire une note..."
        const textarea = screen.getByPlaceholderText('Écrire une note...');
        expect(textarea).toHaveValue('');
    });

    it('deletes a note via the trash button', async () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Note to delete', content: 'Content', updatedAt: Date.now() },
        ]);

        renderAndSwitchToNotes();

        // Open drawer
        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);

        // Click delete button
        const deleteBtn = screen.getByLabelText('Supprimer la note');
        await userEvent.click(deleteBtn);

        const store = stores['med-pilot-quick-notes-v2'];
        expect(store.save).toHaveBeenCalled();
        const remaining = store.save.mock.lastCall?.[0] as QuickNote[];
        expect(remaining).toHaveLength(0);
    });

    it('updates existing note when saving during edit mode', async () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'Old title', content: 'Old content', updatedAt: Date.now() - 10000 },
        ]);

        renderAndSwitchToNotes();

        // Open drawer and click note to edit
        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);
        await userEvent.click(screen.getByText('Old title'));

        // Clear and type new content
        const textarea = screen.getByPlaceholderText('Modifier la note...');
        await userEvent.clear(textarea);
        await userEvent.type(textarea, 'Updated content');

        // Save
        await userEvent.click(screen.getByText('Mettre à jour'));

        const store = stores['med-pilot-quick-notes-v2'];
        const updatedNotes = store.save.mock.lastCall?.[0] as QuickNote[];
        expect(updatedNotes).toHaveLength(1);
        expect(updatedNotes[0].id).toBe('1'); // Same id, not a new note
        expect(updatedNotes[0].content).toBe('Updated content');
        expect(updatedNotes[0].title).toBe('Updated content');
    });

    it('shows note count badge on the Notes tab', () => {
        getStore('med-pilot-quick-notes-v2', [
            { id: '1', title: 'A', content: 'A', updatedAt: Date.now() },
            { id: '2', title: 'B', content: 'B', updatedAt: Date.now() },
            { id: '3', title: 'C', content: 'C', updatedAt: Date.now() },
        ]);

        render(<TasksNotes />);

        // The notes tab should show (3)
        expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('shows "Aucune note sauvegardée" when drawer is open but no notes', async () => {
        renderAndSwitchToNotes();

        const drawerToggle = screen.getByLabelText(/notes sauvegardées/i);
        await userEvent.click(drawerToggle);

        expect(screen.getByText('Aucune note sauvegardée')).toBeInTheDocument();
    });
});

describe('TasksNotes — Tasks tab (regression)', () => {
    beforeEach(() => {
        Object.keys(stores).forEach(k => delete stores[k]);
    });

    it('renders tasks tab by default', () => {
        render(<TasksNotes />);
        expect(screen.getByPlaceholderText('Ajouter une tâche...')).toBeInTheDocument();
    });

    it('adds a task', async () => {
        render(<TasksNotes />);

        const input = screen.getByPlaceholderText('Ajouter une tâche...');
        await userEvent.type(input, 'New task{enter}');

        const store = stores['med-pilot-quick-tasks'];
        expect(store.save).toHaveBeenCalled();
        const tasks = store.save.mock.lastCall?.[0] as Array<{ text: string }>;
        expect(tasks.some(t => t.text === 'New task')).toBe(true);
    });
});
