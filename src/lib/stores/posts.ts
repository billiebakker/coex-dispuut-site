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
	arrayUnion,
	arrayRemove,
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

	// Derived store for easier access
	return {
		subscribe: store.subscribe,

		/**
		 * Fetch posts from Firestore with pagination
		 */
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

				// If we have a last document, start after it for pagination
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
					const liked = data.likedBy?.includes(currentUser) || false;
					const disliked = data.dislikedBy?.includes(currentUser) || false;

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

		/**
		 * Refresh posts (clear and fetch from start)
		 */
		async refreshPosts() {
			store.set({
				posts: [],
				pendingRequest: false,
				noMorePosts: false,
				lastDoc: null
			});
			await this.fetchPosts();
		},

		/**
		 * Toggle like on a post
		 */
		async handleLike(postId: string) {
			const currentUser = await new Promise<string | null>((resolve) => {
				const unsubscribe = userStore.subscribe((u) => {
					unsubscribe();
					resolve(u.currentUser?.uid || null);
				});
			});

			const postRef = doc(DB, 'posts', postId);
			let state: PostsState;
			store.update((s) => {
				state = s;
				return s;
			});

			const post = state!.posts.find((p) => p.docID === postId);
			if (!post) return;

			try {
				if (post.liked) {
					// Unlike
					await updateDoc(postRef, {
						likedBy: arrayRemove(currentUser),
						likeCount: post.likeCount - 1
					});
					post.liked = false;
					post.likeCount--;
				} else {
					// Like and remove dislike if exists
					const updates: any = { likedBy: arrayUnion(currentUser), likeCount: post.likeCount + 1 };

					if (post.disliked) {
						updates.dislikedBy = arrayRemove(currentUser);
						updates.dislikeCount = post.dislikeCount - 1;
						post.disliked = false;
						post.dislikeCount--;
					}

					await updateDoc(postRef, updates);
					post.liked = true;
					post.likeCount++;
				}

				store.update((s) => ({
					...s,
					posts: s.posts.map((p) => (p.docID === postId ? post : p))
				}));
			} catch (error) {
				console.error('Error toggling like:', error);
			}
		},

		async handleDislike(postId: string) {
			const currentUser = await new Promise<string | null>((resolve) => {
				const unsubscribe = userStore.subscribe((u) => {
					unsubscribe();
					resolve(u.currentUser?.uid || null);
				});
			});

			const postRef = doc(DB, 'posts', postId);
			let state: PostsState;
			store.update((s) => {
				state = s;
				return s;
			});

			const post = state!.posts.find((p) => p.docID === postId);
			if (!post) return;

			try {
				if (post.disliked) {
					// Remove dislike
					await updateDoc(postRef, {
						dislikedBy: arrayRemove(currentUser),
						dislikeCount: post.dislikeCount - 1
					});
					post.disliked = false;
					post.dislikeCount--;
				} else {
					// Dislike and remove like if exists
					const updates: any = {
						dislikedBy: arrayUnion(currentUser),
						dislikeCount: post.dislikeCount + 1
					};

					if (post.liked) {
						updates.likedBy = arrayRemove(currentUser);
						updates.likeCount = post.likeCount - 1;
						post.liked = false;
						post.likeCount--;
					}

					await updateDoc(postRef, updates);
					post.disliked = true;
					post.dislikeCount++;
				}

				store.update((s) => ({
					...s,
					posts: s.posts.map((p) => (p.docID === postId ? post : p))
				}));
			} catch (error) {
				console.error('Error toggling dislike:', error);
			}
		},

		/**
		 * Fetch a single post by ID
		 */
		async fetchPostById(postId: string): Promise<Post | null> {
			try {
				const postRef = doc(DB, 'posts', postId);
				const docSnap = await getDoc(postRef);

				if (!docSnap.exists()) {
					console.error('Post not found');
					return null;
				}

				// Get current user ID from store
				let currentUserId: string | null = null;
				const unsubscribe = userStore.subscribe((u) => {
					currentUserId = u.currentUser?.uid || null;
				});
				unsubscribe();

				const data = docSnap.data();
				const liked = data.likedBy?.includes(currentUserId) || false;
				const disliked = data.dislikedBy?.includes(currentUserId) || false;

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
