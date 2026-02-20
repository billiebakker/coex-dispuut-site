<script lang="ts">
	import { goto } from '$app/navigation';
	import ProfilePicture from '../common/ProfilePicture.svelte';

	interface Post {
		docID: string;
		postText: string;
		userDisplayName: string;
		userPhotoURL?: string | null;
		datePosted: string;
		commentCount: number;
		likeCount: number;
		dislikeCount: number;
		liked?: boolean;
		disliked?: boolean;
	}

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
		window.dispatchEvent(new CustomEvent('toggleLike', { detail: { postId: post.docID } }));
	}

	function toggleDislike() {
		window.dispatchEvent(new CustomEvent('toggleDislike', { detail: { postId: post.docID } }));
	}
</script>

<section
	class="outline-ribbook-yellow flex w-full max-w-[480px] flex-col items-center gap-2.5 rounded-xl bg-white outline outline-3"
>
	<!-- HEADER: PROFILE + NAME + TIME -->
	<header
		class="flex w-full flex-col items-center gap-1"
		onclick={goToPost}
		role="button"
		tabindex="0"
	>
		<div class="flex h-14 w-full items-center gap-1 overflow-hidden pr-[22px] pl-1.5">
			<ProfilePicture photoURL={post.userPhotoURL} size="small" writeable={false} />
			<div class="flex items-center gap-6 overflow-hidden px-[9px]">
				<h2 class="font-roboto text-base font-semibold text-black">
					{post.userDisplayName || 'Onbekend'}
				</h2>
				<p class="text-text-muted font-roboto text-sm font-normal">
					{getTimeAgo(post.datePosted)}
				</p>
			</div>
		</div>
	</header>

	<!-- POST TEXT -->
	<article
		class="flex w-full flex-col items-center gap-[13px] overflow-hidden px-3 py-[5px]"
		onclick={goToPost}
		role="button"
		tabindex="0"
	>
		<p class="font-roboto w-full text-base font-normal text-black">
			{post.postText}
		</p>
	</article>

	<!-- FOOTER: ACTIONS -->
	<footer class="flex w-full items-center justify-between px-6 py-1">
		<!-- COMMENTS -->
		<button
			onclick={goToPost}
			class="hover:bg-bg-light flex h-10 w-20 items-center justify-center gap-1 rounded-full transition-all duration-200 ease-in-out"
		>
			<span class="material-symbols-rounded icon icon-gray">chat_bubble</span>
			<span class="text-comment-stats text-text-muted font-normal">
				{post.commentCount}
			</span>
		</button>

		<!-- LIKES -->
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

		<!-- DISLIKES -->
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
