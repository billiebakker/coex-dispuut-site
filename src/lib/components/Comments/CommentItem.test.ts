import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommentItem from './CommentItem.svelte';

describe('CommentItem', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders comment content and relative time', () => {
		vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z'));

		render(CommentItem, {
			props: {
				comment: {
					docID: 'comment-1',
					commentText: 'Dit is een testreactie',
					datePosted: '2026-03-04T11:00:00.000Z',
					uid: 'user-1',
					userDisplayName: 'Billie',
					userPhotoURL: null
				}
			}
		});

		expect(screen.getByText('Dit is een testreactie')).toBeInTheDocument();
		expect(screen.getByText('Billie')).toBeInTheDocument();
		expect(screen.getByText('1h geleden')).toBeInTheDocument();
	});

	it('falls back to default display name when empty', () => {
		vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z'));

		render(CommentItem, {
			props: {
				comment: {
					docID: 'comment-2',
					commentText: 'Nog een reactie',
					datePosted: '2026-03-04T11:59:30.000Z',
					uid: 'user-2',
					userDisplayName: '',
					userPhotoURL: null
				}
			}
		});

		expect(screen.getByText('Nog een reactie')).toBeInTheDocument();
		expect(screen.getByText('Onbekend')).toBeInTheDocument();
		expect(screen.getByText('30s geleden')).toBeInTheDocument();
	});
});
