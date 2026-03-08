import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockIncrement = vi.fn((value: number) => ({ __increment: value }));
const mockOrderBy = vi.fn();
const mockQuery = vi.fn();
const mockUpdateDoc = vi.fn();

let mockUserState: {
	currentUser: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
	userProfile: { displayName?: string | null; photoURL?: string | null } | null;
};

vi.mock('firebase/firestore', () => ({
	addDoc: mockAddDoc,
	collection: mockCollection,
	doc: mockDoc,
	getDocs: mockGetDocs,
	increment: mockIncrement,
	orderBy: mockOrderBy,
	query: mockQuery,
	updateDoc: mockUpdateDoc
}));

vi.mock('$lib/firebase/client/config.client', () => ({
	DB: { __db: true }
}));

vi.mock('$lib/stores/user', () => ({
	userStore: {
		subscribe: (callback: (value: typeof mockUserState) => void) => {
			callback(mockUserState);
			return () => {};
		}
	}
}));

describe('commentsStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();

		mockUserState = {
			currentUser: { uid: 'user-1', displayName: 'Auth Name', photoURL: 'auth.png' },
			userProfile: { displayName: 'Profile Name', photoURL: 'profile.png' }
		};

		mockCollection.mockImplementation((...segments: string[]) => ({ segments }));
		mockQuery.mockImplementation((...args: unknown[]) => ({ args }));
		mockOrderBy.mockImplementation((field: string, direction: string) => ({ field, direction }));
		mockDoc.mockImplementation((...segments: string[]) => ({ segments }));
		mockUpdateDoc.mockResolvedValue(undefined);
	});

	it('fetches comments and maps defaults', async () => {
		mockGetDocs.mockResolvedValue({
			docs: [
				{
					id: 'comment-1',
					data: () => ({
						commentText: 'Hallo',
						datePosted: '2026-03-04T10:00:00.000Z',
						uid: 'user-2',
						userDisplayName: '',
						userPhotoURL: null
					})
				}
			]
		});

		const { commentsStore } = await import('./comments');
		await commentsStore.fetchComments('post-1');

		const state = get(commentsStore);
		expect(state.pendingRequest).toBe(false);
		expect(state.loadedForPostId).toBe('post-1');
		expect(state.comments).toHaveLength(1);
		expect(state.comments[0]).toMatchObject({
			docID: 'comment-1',
			commentText: 'Hallo',
			userDisplayName: 'Onbekend'
		});
	});

	it('handles fetch errors by resetting comments', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockGetDocs.mockRejectedValue(new Error('boom'));

		const { commentsStore } = await import('./comments');
		await commentsStore.fetchComments('post-err');

		const state = get(commentsStore);
		expect(state.pendingRequest).toBe(false);
		expect(state.loadedForPostId).toBe('post-err');
		expect(state.comments).toEqual([]);
		consoleErrorSpy.mockRestore();
	});

	it('creates a comment and increments post comment count', async () => {
		mockAddDoc.mockResolvedValue({ id: 'comment-new' });

		const { commentsStore } = await import('./comments');
		const newComment = await commentsStore.createComment('post-2', 'Nieuwe reactie');
		const state = get(commentsStore);

		expect(mockAddDoc).toHaveBeenCalledTimes(1);
		expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
		expect(newComment).toMatchObject({
			docID: 'comment-new',
			commentText: 'Nieuwe reactie',
			uid: 'user-1',
			userDisplayName: 'Profile Name',
			userPhotoURL: 'profile.png'
		});
		expect(state.comments).toHaveLength(1);
		expect(state.loadedForPostId).toBe('post-2');
	});

	it('throws when creating a comment without logged-in user', async () => {
		mockUserState = { currentUser: null, userProfile: null };

		const { commentsStore } = await import('./comments');
		await expect(commentsStore.createComment('post-3', 'x')).rejects.toThrow(
			'Geen gebruiker ingelogd'
		);
	});
});
