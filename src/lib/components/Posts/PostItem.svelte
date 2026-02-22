<script lang="ts">
	import { goto } from '$app/navigation';
	import ProfilePicture from '../common/ProfilePicture.svelte';
	import { postsStore } from '$lib/stores/posts';
	import { userStore } from '$lib/stores/user';
	import type { Post } from '$lib/stores/posts';

	interface Props {
		post: Post;
	}

	let { post }: Props = $props();

	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (secondsAgo < 60) return `${secondsAgo}s geleden`;
		if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m geleden`;
		if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h geleden`;
		return `${Math.floor(secondsAgo / 86400)}d geleden`;
	}

	function goToPost() {
		goto(`/post/${post.docID}`);
	}

	function toggleLike() {
		postsStore.handleLike(post.docID, post);
	}

	function toggleDislike() {
		postsStore.handleDislike(post.docID, post);
	}

	const canDeletePost = $derived(
		post.uid === $userStore.currentUser?.uid || $userStore.userProfile?.role === 'admin'
	);

	async function removePost() {
		if (!canDeletePost) return;
		const confirmed = window.confirm('deze echt verwijderen?');
		if (!confirmed) return;
		await postsStore.deletePost(post.docID);
	}
</script>

<section
	class="outline-ribbook-yellow flex w-full max-w-120 flex-col items-center gap-2.5 rounded-xl bg-white outline-3"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<header class="flex w-full items-center gap-1" onclick={goToPost} role="button" tabindex="0">
		<div class="flex h-14 w-full items-center gap-1 overflow-hidden pr-5.5 pl-1.5">
			<ProfilePicture photoURL={post.userPhotoURL} size="small" writeable={false} />
			<div class="flex items-center gap-6 overflow-hidden px-2.25">
				<h2 class="font-roboto text-base font-semibold text-black">
					{post.userDisplayName || 'Onbekend'}
				</h2>
				<p class="text-text-muted font-roboto text-sm font-normal">
					{getTimeAgo(post.datePosted)}
				</p>
			</div>
		</div>
		{#if canDeletePost}
			<button
				onclick={removePost}
				class="hover:bg-bg-light mr-6 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ease-in-out"
				aria-label="Verwijder post"
			>
				<span class="material-symbols-rounded icon icon-gray">delete</span>
			</button>
		{/if}
	</header>

	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<article
		class="flex w-full flex-col items-center gap-3.25 overflow-hidden px-3 py-1.25"
		onclick={goToPost}
		role="button"
		tabindex="0"
	>
		<p class="font-roboto w-full text-base font-normal text-black">
			{post.postText}
		</p>
	</article>

	<footer class="flex w-full items-center justify-between px-6 py-1">
		<button
			onclick={goToPost}
			class="hover:bg-bg-light flex h-10 w-20 items-center justify-center gap-1 rounded-full transition-all duration-200 ease-in-out"
		>
			<span class="material-symbols-rounded icon icon-gray">chat_bubble</span>
			<span class="text-comment-stats text-text-muted font-normal">
				{post.commentCount}
			</span>
		</button>

		<button
			onclick={toggleLike}
			class="hover:bg-bg-light flex h-10 w-20 items-center justify-center gap-1 rounded-full transition-all duration-200 ease-in-out"
		>
			<span
				class="material-symbols-rounded icon"
				class:text-ribbook-yellow={post.liked}
				class:text-icon-fill={!post.liked}
			>
				handshake
			</span>
			<span
				class="text-comment-stats"
				class:text-ribbook-yellow={post.liked}
				class:font-bold={post.liked}
				class:text-text-muted={!post.liked}
				class:font-normal={!post.liked}
			>
				{post.likeCount}
			</span>
		</button>

		<button
			onclick={toggleDislike}
			class="hover:bg-bg-light flex h-10 w-20 items-center justify-center gap-1 rounded-full transition-all duration-200 ease-in-out"
		>
			<span
				class="material-symbols-rounded icon"
				class:text-ribbook-red={post.disliked}
				class:text-icon-fill={!post.disliked}
			>
				gavel
			</span>
			<span
				class="text-comment-stats"
				class:text-ribbook-red={post.disliked}
				class:font-bold={post.disliked}
				class:text-text-muted={!post.disliked}
				class:font-normal={!post.disliked}
			>
				{post.dislikeCount}
			</span>
		</button>
	</footer>
</section>
