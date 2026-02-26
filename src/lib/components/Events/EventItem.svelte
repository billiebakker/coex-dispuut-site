<script lang="ts">
	import { goto } from '$app/navigation';
	import type { EventItem as EventData } from '$lib/stores/events';

	interface Props {
		event: EventData;
	}

	let { event }: Props = $props();

	const eventDescription = $derived(
		event.description.length > 180 ? `${event.description.slice(0, 180)}...` : event.description
	);

	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const absSeconds = Math.floor(Math.abs(diff) / 1000);

		if (absSeconds < 60) return diff >= 0 ? 'over enkele seconden' : 'zojuist';
		if (absSeconds < 3600) {
			const minutes = Math.floor(absSeconds / 60);
			return diff >= 0 ? `over ${minutes}m` : `${minutes}m geleden`;
		}
		if (absSeconds < 86400) {
			const hours = Math.floor(absSeconds / 3600);
			return diff >= 0 ? `over ${hours}u` : `${hours}u geleden`;
		}

		const days = Math.floor(absSeconds / 86400);
		return diff >= 0 ? `over ${days}d` : `${days}d geleden`;
	}

	function goToEventDetail() {
		goto(`/activiteiten/${event.docID}`);
	}
</script>

<section
	class="outline-ribbook-yellow flex w-full max-w-[520px] flex-col items-center rounded-xl bg-white outline-3"
	onclick={goToEventDetail}
	onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && goToEventDetail()}
	role="button"
	tabindex="0"
>
	<header class="inline-flex w-full flex-col items-end gap-1 px-2 py-1.5">
		<p class="text-main-medium-gray text-sm font-normal">
			{new Date(event.date).toLocaleDateString('nl-NL', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			})}
		</p>
		<h2 class="text-right text-2xl font-semibold">
			{event.title}
		</h2>
		<p class="text-main-medium-gray text-sm font-normal">
			Aanmelding sluit {getTimeAgo(event.signupDeadline)}
		</p>
	</header>

	{#if !event.headerImage}
		<div class="inline-flex h-0 w-full flex-col gap-2.5 self-stretch px-2 py-2">
			<div class="h-0 self-stretch outline-1 outline-gray-300"></div>
		</div>
	{:else}
		<img class="w-full" src={event.headerImage} alt="" />
	{/if}

	<article class="flex w-full flex-col items-center px-3 py-2">
		<p class="w-full text-base font-normal text-black">{eventDescription}</p>
	</article>

	<footer class="flex w-full items-center justify-between px-5 py-2">
		<div class="flex items-center justify-center gap-1">
			<span class="material-symbols-rounded icon icon-gray">chat_bubble</span>
			<span class="text-comment-stats">{event.commentCount}</span>
		</div>

		<div class="flex items-center justify-center gap-1">
			<span class="material-symbols-rounded icon icon-gray">calendar_month</span>
			<span class="text-comment-stats text-text-muted font-normal">{getTimeAgo(event.date)}</span>
		</div>

		<div class="flex items-center justify-center gap-1">
			<span class="material-symbols-rounded icon icon-gray">group</span>
			<span class="text-comment-stats text-text-muted font-normal">{event.attendeeCount}</span>
		</div>
	</footer>
</section>
