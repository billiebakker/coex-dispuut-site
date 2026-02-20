<script>
	import { page } from '$app/state';
	import PostItem from '$lib/components/Posts/PostItem.svelte';
	import { postsStore } from '$lib/stores/posts';
	import { onMount } from 'svelte';

	let post = $state(null);
	let pendingRequest = $state(true);
	let error = $state(null);

	onMount(async () => {
		const postId = page.params.id;
		const fetchedPost = await postsStore.fetchPostById(postId);
		if (fetchedPost) {
			post = fetchedPost;
		} else {
			error = 'Post not found';
		}
		pendingRequest = false;
	});

	function handleLike() {
		if (post) {
			postsStore.handleLike(post.docID);
		}
	}

	function handleDislike() {
		if (post) {
			postsStore.handleDislike(post.docID);
		}
	}
</script>

<div class="flex w-full flex-1 flex-col items-center gap-2.5 overflow-auto px-2.5 py-1">
	{#if pendingRequest}
		<div>Aan het laden...</div>
	{:else if error}
		<div>{error}</div>
	{:else if post}
		<PostItem {post} on:toggle-like={handleLike} on:toggle-dislike={handleDislike} />
	{/if}
</div>
