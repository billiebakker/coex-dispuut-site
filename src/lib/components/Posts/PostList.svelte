<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import CreatePost from './CreatePost.svelte';
	import PostItem from './PostItem.svelte';
	import { postsStore } from '$lib/stores/posts';

	let scrollParent: Window | Element | null = null;
	let scrollHandler: (() => void) | null = null;

	function getClosestScrollableParent(node: Element): Window | Element {
		let el: Element | null = node.parentElement;
		while (el && el !== document.body) {
			const style = getComputedStyle(el);
			const oy = style.overflowY;
			if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return el;
			el = el.parentElement;
		}
		return window;
	}

	async function checkAndLoadMore() {
		const el =
			scrollParent === window
				? document.scrollingElement || document.documentElement
				: (scrollParent as Element);

		if (!el) return;
		const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
		const isSearching = $postsStore.searchQuery.trim().length > 0;

		if (nearBottom && !isSearching && !$postsStore.pendingRequest && !$postsStore.noMorePosts) {
			await postsStore.fetchPosts();
		}
	}

	onMount(() => {
		const element = document.querySelector('[data-post-list]');
		if (element) {
			scrollParent = getClosestScrollableParent(element);
		}

		scrollHandler = () => checkAndLoadMore();

		if (scrollParent === window) {
			window.addEventListener('scroll', scrollHandler, { passive: true });
		} else if (scrollParent) {
			(scrollParent as Element).addEventListener('scroll', scrollHandler, { passive: true });
		}

		// post aangemaakt?
		const handlePostCreated = async () => await postsStore.refreshPosts();
		window.addEventListener('postCreated', handlePostCreated);

		setTimeout(() => checkAndLoadMore(), 0);

		postsStore.fetchPosts();

		return () => {
			if (scrollParent === window) {
				window.removeEventListener('scroll', scrollHandler!);
			} else if (scrollParent) {
				(scrollParent as Element).removeEventListener('scroll', scrollHandler!);
			}
			window.removeEventListener('postCreated', handlePostCreated);
		};
	});

	onDestroy(() => {
		if (scrollHandler) {
			if (scrollParent === window) {
				window.removeEventListener('scroll', scrollHandler);
			} else if (scrollParent) {
				(scrollParent as Element).removeEventListener('scroll', scrollHandler);
			}
		}
	});
</script>

<div
	class="flex w-full flex-1 flex-col items-center justify-start gap-2.5 overflow-auto px-2.5 py-1"
	data-post-list
>
	<label for="post-search" class="sr-only">Zoek posts</label>
	<input
		id="post-search"
		type="search"
		placeholder="Zoek in posts of namen..."
		value={$postsStore.searchQuery}
		oninput={(event) => postsStore.setSearchQuery((event.currentTarget as HTMLInputElement).value)}
		class="outline-ribbook-yellow text-text-primary h-10 w-full max-w-120 rounded-lg bg-white px-3 outline -outline-offset-1"
	/>

	<CreatePost />

	{#each $postsStore.filteredPosts as post (post.docID)}
		<PostItem {post} />
	{/each}

	{#if $postsStore.searchQuery.trim() && $postsStore.pendingRequest}
		<p class="text-text-muted font-roboto text-sm">Aan het zoeken...</p>
	{/if}

	{#if $postsStore.filteredPosts.length === 0 && !$postsStore.pendingRequest}
		<p class="text-text-muted font-roboto text-sm">Geen posts gevonden voor deze zoekopdracht.</p>
	{/if}

	{#if !$postsStore.searchQuery.trim()}
		<button
			onclick={async () => await postsStore.fetchPosts()}
			disabled={$postsStore.pendingRequest || $postsStore.noMorePosts}
			class="outline-ribbook-yellow flex h-10.5 w-56 items-center justify-center gap-2.5 rounded outline -outline-offset-1 disabled:opacity-50"
		>
			<span class="text-ribbook-yellow text-center">
				{$postsStore.noMorePosts
					? 'Geen posts meer. Ga posten!!!'
					: $postsStore.pendingRequest
						? 'Aan het laden...'
						: 'Meer laden'}
			</span>
		</button>
	{/if}
</div>
