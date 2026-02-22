<script>
	import { page } from '$app/state';
	import PostItem from '$lib/components/Posts/PostItem.svelte';
	import { postsStore } from '$lib/stores/posts';
	import { onMount } from 'svelte';

	/** @type {import('$lib/stores/posts').Post | null} */
	let post = $state(null);
	let pendingRequest = $state(true);
	let error = $state('');

	onMount(async () => {
		const postId = page.params.id;
		if (!postId) {
			error = 'Post not found';
			pendingRequest = false;
			return;
		}
		const fetchedPost = await postsStore.fetchPostById(postId);
		if (fetchedPost) {
			post = fetchedPost;
		} else {
			error = 'Post not found';
		}
		pendingRequest = false;
	});
</script>

<div class="flex w-full flex-1 flex-col items-center gap-2.5 overflow-auto px-2.5 py-1">
	{#if pendingRequest}
		<div>Aan het laden...</div>
	{:else if error}
		<div>{error}</div>
	{:else if post}
		<PostItem {post} />
	{/if}
</div>
