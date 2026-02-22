import { writable, type Writable } from 'svelte/store';
import {
	collection,
	query,
	orderBy,
	limit,
	startAfter,
	getDocs,
	getDoc,
	updateDoc,
	doc,
	increment,
	deleteField,
	DocumentSnapshot
} from 'firebase/firestore';
import { DB } from '$lib/firebase/client/config.client';
import { userStore } from './user';

export interface Post {
	docID: string;
	postText: string;
	userDisplayName: string;
	userPhotoURL?: string | null;
	datePosted: string;
	commentCount: number;
	likeCount: number;
	dislikeCount: number;
	uid: string;
	reactions?: { [key: string]: 'like' | 'dislike' };
	liked?: boolean;
	disliked?: boolean;
}

interface PostsState {
	posts: Post[];
	pendingRequest: boolean;
	noMorePosts: boolean;
	lastDoc: DocumentSnapshot | null;
}

const POSTS_PER_PAGE = 10;

function createPostsStore() {
	const store: Writable<PostsState> = writable({
		posts: [],
		pendingRequest: false,
		noMorePosts: false,
		lastDoc: null
	});

	return {
		subscribe: store.subscribe,

		async fetchPosts() {
			store.update((state) => ({ ...state, pendingRequest: true }));

			try {
				let postsQuery = query(
					collection(DB, 'posts'),
					orderBy('datePosted', 'desc'),
					limit(POSTS_PER_PAGE)
				);

				let state: PostsState;
				store.update((s) => {
					state = s;
					return s;
				});

				if (state!.lastDoc) {
					postsQuery = query(
						collection(DB, 'posts'),
						orderBy('datePosted', 'desc'),
						startAfter(state!.lastDoc),
						limit(POSTS_PER_PAGE)
					);
				}

				const snapshot = await getDocs(postsQuery);

				if (snapshot.docs.length === 0) {
					store.update((s) => ({
						...s,
						pendingRequest: false,
						noMorePosts: true
					}));
					return;
				}

				const currentUser = await new Promise<string | null>((resolve) => {
					userStore.subscribe((u) => {
						resolve(u.currentUser?.uid || null);
					});
				});

				const newPosts: Post[] = snapshot.docs.map((docSnap) => {
					const data = docSnap.data();
					const liked = currentUser ? data.reactions?.[currentUser] === 'like' : false;
					const disliked = currentUser ? data.reactions?.[currentUser] === 'dislike' : false;

					return {
						docID: docSnap.id,
						postText: data.postText,
						userDisplayName: data.userDisplayName || 'Onbekend',
						userPhotoURL: data.userPhotoURL || null,
						datePosted: data.datePosted,
						commentCount: data.commentCount || 0,
						likeCount: data.likeCount || 0,
						dislikeCount: data.dislikeCount || 0,
						uid: data.uid,
						reactions: data.reactions || {},
						liked,
						disliked
					};
				});

				store.update((s) => ({
					...s,
					posts: [...s.posts, ...newPosts],
					lastDoc: snapshot.docs[snapshot.docs.length - 1],
					pendingRequest: false
				}));
			} catch (error) {
				console.error('Error fetching posts:', error);
				store.update((s) => ({ ...s, pendingRequest: false }));
			}
		},

		async refreshPosts() {
			store.set({
				posts: [],
				pendingRequest: false,
				noMorePosts: false,
				lastDoc: null
			});
			await this.fetchPosts();
		},

		async handleLike(postId: string, localPost?: Post) {
			await this.handleReaction(postId, 'like', localPost);
		},

		async handleDislike(postId: string, localPost?: Post) {
			await this.handleReaction(postId, 'dislike', localPost);
		},

		async handleReaction(postId: string, type: 'like' | 'dislike', localPost?: Post) {
			let currentUser: string | null = null;
			const unsubscribe = userStore.subscribe((u) => {
				currentUser = u.currentUser?.uid || null;
			});
			unsubscribe();

			if (!currentUser) return;

			// zodat het werkt voor 1 post of meerdere
			let post = localPost;
			if (!post) {
				let state: PostsState;
				store.update((s) => {
					state = s;
					return s;
				});
				post = state!.posts.find((p) => p.docID === postId);
			}

			if (!post) return;

			const otherType = type === 'like' ? 'dislike' : 'like';
			const wasActive = post[`${type}d`];
			const wasOtherActive = post[`${otherType}d`];

			const postRef = doc(DB, 'posts', postId);

			// alleen visueel
			post[`${type}d`] = !wasActive;
			post[`${type}Count`] += wasActive ? -1 : 1;
			if (wasOtherActive) {
				post[`${otherType}d`] = false;
				post[`${otherType}Count`] = Math.max(0, post[`${otherType}Count`] - 1);
			}

			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const updates: any = {};
				if (post[`${type}d`]) {
					updates[`reactions.${currentUser}`] = type;
					updates[`${type}Count`] = increment(1);
					if (wasOtherActive) updates[`${otherType}Count`] = increment(-1);
				} else {
					updates[`reactions.${currentUser}`] = deleteField();
					updates[`${type}Count`] = increment(-1);
				}

				await updateDoc(postRef, updates);

				store.update((s) => ({
					...s,
					posts: s.posts.map((p) => (p.docID === postId ? post : p))
				}));
			} catch (error) {
				console.error(`Failed to update reaction:`, error);

				// revert UI if error
				post[`${type}d`] = wasActive;
				post[`${type}Count`] = wasActive
					? post[`${type}Count`] + 1
					: Math.max(0, post[`${type}Count`] - 1);

				if (wasOtherActive !== post[`${otherType}d`]) {
					post[`${otherType}d`] = wasOtherActive;
					post[`${otherType}Count`] = wasOtherActive
						? post[`${otherType}Count`] + 1
						: Math.max(0, post[`${otherType}Count`] - 1);
				}

				store.update((s) => ({
					...s,
					posts: s.posts.map((p) => (p.docID === postId ? post : p))
				}));
			}
		},

		async fetchPostById(postId: string): Promise<Post | null> {
			try {
				const postRef = doc(DB, 'posts', postId);
				const docSnap = await getDoc(postRef);

				if (!docSnap.exists()) {
					console.error('Post not found');
					return null;
				}

				const currentUser = await new Promise<string | null>((resolve) => {
					userStore.subscribe((u) => {
						resolve(u.currentUser?.uid || null);
					});
				});

				const data = docSnap.data();
				const liked = currentUser ? data.reactions?.[currentUser] === 'like' : false;
				const disliked = currentUser ? data.reactions?.[currentUser] === 'dislike' : false;
				return {
					docID: docSnap.id,
					postText: data.postText,
					userDisplayName: data.userDisplayName || 'Onbekend',
					userPhotoURL: data.userPhotoURL || null,
					datePosted: data.datePosted,
					commentCount: data.commentCount || 0,
					likeCount: data.likeCount || 0,
					dislikeCount: data.dislikeCount || 0,
					uid: data.uid,
					reactions: data.reactions || {},
					liked,
					disliked
				};
			} catch (error) {
				console.error('Error fetching post:', error);
				return null;
			}
		}
	};
}

export const postsStore = createPostsStore();
