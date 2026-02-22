<script lang="ts">
	import ProfilePicture from '../common/ProfilePicture.svelte';
	import type { PostComment } from '$lib/stores/comments';

	interface Props {
		comment: PostComment;
	}

	let { comment }: Props = $props();

	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (secondsAgo < 60) return `${secondsAgo}s geleden`;
		if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m geleden`;
		if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h geleden`;
		return `${Math.floor(secondsAgo / 86400)}d geleden`;
	}
</script>

<section
	class="outline-ribbook-yellow flex w-full max-w-120 flex-col items-center gap-2.5 rounded-xl bg-white outline-3"
>
	<header class="flex w-full flex-col items-center gap-1">
		<div class="flex h-14 w-full items-center gap-1 overflow-hidden pr-5.5 pl-1.5">
			<ProfilePicture photoURL={comment.userPhotoURL} size="small" writeable={false} />
			<div class="flex items-center gap-6 overflow-hidden px-2.25">
				<h2 class="font-roboto text-base font-semibold text-black">
					{comment.userDisplayName || 'Onbekend'}
				</h2>
				<p class="text-text-muted font-roboto text-sm font-normal">
					{getTimeAgo(comment.datePosted)}
				</p>
			</div>
		</div>
	</header>

	<article class="flex w-full flex-col items-center gap-3.25 overflow-hidden px-3 py-1.25">
		<p class="font-roboto w-full text-base font-normal text-black">
			{comment.commentText}
		</p>
	</article>
</section>
