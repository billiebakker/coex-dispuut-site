import { get, writable, type Writable } from 'svelte/store';
import {
	collection,
	query,
	orderBy,
	limit,
	startAfter,
	startAt,
	endAt,
	where,
	getDocs,
	getDoc,
	updateDoc,
	doc,
	increment,
	deleteField,
	deleteDoc
} from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
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
	filteredPosts: Post[];
	searchQuery: string;
	pendingRequest: boolean;
	noMorePosts: boolean;
	lastDoc: DocumentSnapshot | null;
}

const POSTS_PER_PAGE = 10;
const SEARCH_RESULTS_LIMIT = 25;
const MAX_SEARCH_TOKENS = 5;

let searchRequestCounter = 0;

function filterPosts(posts: Post[], searchQuery: string): Post[] {
	const query = searchQuery.trim().toLowerCase();
	if (!query) return posts;

	return posts.filter((post) => {
		const text = post.postText?.toLowerCase() || '';
		const displayName = post.userDisplayName?.toLowerCase() || '';
		return text.includes(query) || displayName.includes(query);
	});
}

function normalizeSearchValue(value: string): string {
	return value.trim().toLowerCase();
}

function tokenizeSearchValue(value: string): string[] {
	const normalized = normalizeSearchValue(value);
	if (!normalized) return [];

	// ??? regex lastig (remove alle whitespace en special chars)
	const cleaned = normalized.replace(/[^\p{L}\p{N}\s]/gu, ' ');
	return Array.from(new Set(cleaned.split(/\s+/).filter((token) => token.length >= 2))).slice(
		0,
		MAX_SEARCH_TOKENS
	);
}

async function getCurrentUserId(): Promise<string | null> {
	return get(userStore).currentUser?.uid || null;
}

function createPostsStore() {
	const store: Writable<PostsState> = writable({
		posts: [],
		filteredPosts: [],
		searchQuery: '',
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

				const currentUser = await getCurrentUserId();

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
					filteredPosts: filterPosts([...s.posts, ...newPosts], s.searchQuery),
					lastDoc: snapshot.docs[snapshot.docs.length - 1],
					pendingRequest: false
				}));
			} catch (error) {
				console.error('Error fetching posts:', error);
				store.update((s) => ({ ...s, pendingRequest: false }));
			}
		},

		async refreshPosts() {
			let state: PostsState;
			store.update((s) => {
				state = s;
				return s;
			});

			store.set({
				posts: [],
				filteredPosts: [],
				searchQuery: state!.searchQuery,
				pendingRequest: false,
				noMorePosts: false,
				lastDoc: null
			});
			await this.fetchPosts();
		},

		setSearchQuery(searchQuery: string) {
			const activeRequest = ++searchRequestCounter;
			const normalizedQuery = normalizeSearchValue(searchQuery);

			store.update((state) => ({
				...state,
				searchQuery,
				filteredPosts: normalizedQuery ? state.filteredPosts : state.posts
			}));

			if (!normalizedQuery) {
				store.update((state) => ({ ...state, pendingRequest: false }));
				return;
			}

			void this.searchPosts(searchQuery, activeRequest);
		},

		async searchPosts(searchQuery: string, requestId: number) {
			const normalizedQuery = normalizeSearchValue(searchQuery);
			const searchTokens = tokenizeSearchValue(searchQuery);

			if (!normalizedQuery) {
				store.update((state) => ({
					...state,
					filteredPosts: state.posts,
					pendingRequest: false
				}));
				return;
			}

			store.update((state) => ({ ...state, pendingRequest: true }));

			try {
				const currentUser = await getCurrentUserId();

				const postTextQuery = query(
					collection(DB, 'posts'),
					orderBy('postTextLower'),
					startAt(normalizedQuery),
					endAt(`${normalizedQuery}\uf8ff`),
					limit(SEARCH_RESULTS_LIMIT)
				);

				const displayNameQuery = query(
					collection(DB, 'posts'),
					orderBy('userDisplayNameLower'),
					startAt(normalizedQuery),
					endAt(`${normalizedQuery}\uf8ff`),
					limit(SEARCH_RESULTS_LIMIT)
				);

				const tokenQueries = searchTokens.map((token) =>
					query(
						collection(DB, 'posts'),
						where('searchTerms', 'array-contains', token),
						limit(SEARCH_RESULTS_LIMIT)
					)
				);

				const snapshots = await Promise.all([
					getDocs(postTextQuery),
					getDocs(displayNameQuery),
					...tokenQueries.map((tokenQuery) => getDocs(tokenQuery))
				]);

				if (requestId !== searchRequestCounter) return;

				const docsById = new Map<string, Post>();

				for (const snapshot of snapshots) {
					for (const docSnap of snapshot.docs) {
						const data = docSnap.data();
						const liked = currentUser ? data.reactions?.[currentUser] === 'like' : false;
						const disliked = currentUser ? data.reactions?.[currentUser] === 'dislike' : false;

						docsById.set(docSnap.id, {
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
						});
					}
				}

				const searchResults = filterPosts(Array.from(docsById.values()), searchQuery).sort(
					(a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
				);

				store.update((state) => ({
					...state,
					filteredPosts: searchResults,
					pendingRequest: false
				}));
			} catch (error) {
				if (requestId !== searchRequestCounter) return;
				console.error('Error searching posts:', error);
				store.update((state) => ({
					...state,
					filteredPosts: filterPosts(state.posts, searchQuery),
					pendingRequest: false
				}));
			}
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
					posts: s.posts.map((p) => (p.docID === postId ? post : p)),
					filteredPosts: filterPosts(
						s.posts.map((p) => (p.docID === postId ? post : p)),
						s.searchQuery
					)
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
					posts: s.posts.map((p) => (p.docID === postId ? post : p)),
					filteredPosts: filterPosts(
						s.posts.map((p) => (p.docID === postId ? post : p)),
						s.searchQuery
					)
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

				const currentUser = await getCurrentUserId();

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
		},

		async deletePost(postId: string) {
			try {
				await deleteDoc(doc(DB, 'posts', postId));
				store.update((s) => ({
					...s,
					posts: s.posts.filter((post) => post.docID !== postId),
					filteredPosts: filterPosts(
						s.posts.filter((post) => post.docID !== postId),
						s.searchQuery
					)
				}));
			} catch (error) {
				console.error('Error deleting post:', error);
			}
		}
	};
}

export const postsStore = createPostsStore();
