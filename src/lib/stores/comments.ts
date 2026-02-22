import { writable, type Writable } from 'svelte/store';
import {
	addDoc,
	collection,
	getDocs,
	increment,
	orderBy,
	query,
	updateDoc,
	doc
} from 'firebase/firestore';
import { DB } from '$lib/firebase/client/config.client';
import { userStore } from './user';

export interface PostComment {
	docID: string;
	commentText: string;
	datePosted: string;
	uid: string;
	userDisplayName: string;
	userPhotoURL?: string | null;
}

interface CommentsState {
	comments: PostComment[];
	pendingRequest: boolean;
	loadedForPostId: string | null;
}

function createCommentsStore() {
	const store: Writable<CommentsState> = writable({
		comments: [],
		pendingRequest: false,
		loadedForPostId: null
	});

	return {
		subscribe: store.subscribe,

		async fetchComments(postId: string) {
			store.update((state) => ({ ...state, pendingRequest: true }));

			try {
				const commentsQuery = query(
					collection(DB, 'posts', postId, 'comments'),
					orderBy('datePosted', 'asc')
				);
				const snapshot = await getDocs(commentsQuery);

				const comments: PostComment[] = snapshot.docs.map((docSnap) => {
					const data = docSnap.data();
					return {
						docID: docSnap.id,
						commentText: data.commentText,
						datePosted: data.datePosted,
						uid: data.uid,
						userDisplayName: data.userDisplayName || 'Onbekend',
						userPhotoURL: data.userPhotoURL || null
					};
				});

				store.update((state) => ({
					...state,
					comments,
					pendingRequest: false,
					loadedForPostId: postId
				}));
			} catch (error) {
				console.error('Error fetching comments:', error);
				store.update((state) => ({
					...state,
					comments: [],
					pendingRequest: false,
					loadedForPostId: postId
				}));
			}
		},

		async createComment(postId: string, commentText: string) {
			let currentUserUid: string | null = null;
			let currentUserDisplayName: string | null = null;
			let currentUserPhotoURL: string | null = null;

			const unsubscribe = userStore.subscribe((userState) => {
				currentUserUid = userState.currentUser?.uid || null;
				currentUserDisplayName =
					userState.userProfile?.displayName || userState.currentUser?.displayName || null;
				currentUserPhotoURL =
					userState.userProfile?.photoURL || userState.currentUser?.photoURL || null;
			});
			unsubscribe();

			if (!currentUserUid) {
				throw new Error('Geen gebruiker ingelogd');
			}

			const newCommentPayload = {
				commentText,
				datePosted: new Date().toISOString(),
				uid: currentUserUid,
				userDisplayName: currentUserDisplayName || 'Onbekend',
				userPhotoURL: currentUserPhotoURL
			};

			const newCommentRef = await addDoc(
				collection(DB, 'posts', postId, 'comments'),
				newCommentPayload
			);

			await updateDoc(doc(DB, 'posts', postId), {
				commentCount: increment(1)
			});

			const newComment: PostComment = {
				docID: newCommentRef.id,
				...newCommentPayload
			};

			store.update((state) => ({
				...state,
				comments: [...state.comments, newComment],
				loadedForPostId: postId
			}));

			return newComment;
		},

		reset() {
			store.set({
				comments: [],
				pendingRequest: false,
				loadedForPostId: null
			});
		}
	};
}

export const commentsStore = createCommentsStore();
