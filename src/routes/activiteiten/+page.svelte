<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import EventItem from '$lib/components/Events/EventItem.svelte';
	import { eventsStore } from '$lib/stores/events';

	let scrollParent: Window | Element | null = null;
	let scrollHandler: (() => void) | null = null;

	const loadMoreButtonText = $derived.by(() => {
		if ($eventsStore.noMoreEvents) return 'dat was het!';
		if ($eventsStore.pendingRequest) return 'aan het laden...';
		return 'meer laden';
	});

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

	async function getEvents() {
		await eventsStore.fetchEvents();
	}

	async function checkAndLoadMore() {
		const el =
			scrollParent === window
				? document.scrollingElement || document.documentElement
				: (scrollParent as Element);

		if (!el) return;
		const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
		const isSearching = $eventsStore.searchQuery.trim().length > 0;

		if (nearBottom && !isSearching && !$eventsStore.pendingRequest && !$eventsStore.noMoreEvents) {
			await getEvents();
		}
	}

	function toggleSort() {
		eventsStore.toggleSort();
	}

	async function toggleArchive() {
		await eventsStore.toggleArchive();
	}

	onMount(async () => {
		const element = document.querySelector('[data-event-list]');
		if (element) {
			scrollParent = getClosestScrollableParent(element);
		}

		scrollHandler = () => checkAndLoadMore();

		if (scrollParent === window) {
			window.addEventListener('scroll', scrollHandler, { passive: true });
		} else if (scrollParent) {
			(scrollParent as Element).addEventListener('scroll', scrollHandler, { passive: true });
		}

		await getEvents();
		setTimeout(() => checkAndLoadMore(), 0);
	});

	onDestroy(() => {
		if (!scrollHandler) return;

		if (scrollParent === window) {
			window.removeEventListener('scroll', scrollHandler);
		} else if (scrollParent) {
			(scrollParent as Element).removeEventListener('scroll', scrollHandler);
		}
	});
</script>

<div
	class="flex w-full flex-1 flex-col items-center justify-start gap-2.5 overflow-auto px-2.5 py-1"
	data-event-list
>
	<section
		class="outline-ribbook-yellow flex w-full max-w-[520px] flex-row flex-wrap items-center justify-between gap-2.5 rounded-xl px-5 py-3"
	>
		<label for="event-search" class="sr-only">Zoek activiteiten</label>
		<input
			id="event-search"
			type="search"
			placeholder="Zoek op titel, beschrijving of locatie..."
			value={$eventsStore.searchQuery}
			oninput={(event) =>
				eventsStore.setSearchQuery((event.currentTarget as HTMLInputElement).value)}
			class="outline-ribbook-yellow text-text-primary h-10 w-full rounded-lg bg-white px-3 outline -outline-offset-1"
		/>

		<button
			onclick={toggleSort}
			class="bg-ribbook-red flex cursor-pointer items-center justify-center gap-1 rounded-lg p-2 pr-3 hover:bg-white/20"
		>
			<span class="material-symbols-rounded icon icon-yellow"
				>{$eventsStore.sortAscending ? 'arrow_upward' : 'arrow_downward'}</span
			>
			<span class="text-ribbook-yellow text-sm font-semibold">Eerstvolgende</span>
		</button>

		<a
			href="/activiteiten/aanmaken"
			class="bg-ribbook-red flex items-center justify-center gap-1 rounded-lg p-2 hover:bg-white/20"
		>
			<span class="material-symbols-rounded icon icon-yellow">add_ad</span>
			<span class="text-ribbook-yellow text-sm font-semibold">Nieuw</span>
		</a>

		<button
			onclick={toggleArchive}
			class={`bg-ribbook-red flex cursor-pointer items-center justify-start gap-1 rounded-lg p-2 pr-2.5 hover:bg-white/20 ${$eventsStore.showArchive ? 'bg-white/30' : ''}`}
		>
			<span class="material-symbols-rounded icon icon-yellow"
				>{$eventsStore.showArchive ? 'history_off' : 'history'}</span
			>
			<span class="text-ribbook-yellow text-sm font-semibold">Archief</span>
		</button>
	</section>

	{#each $eventsStore.filteredEvents as event (event.docID)}
		<EventItem {event} />
	{/each}

	{#if $eventsStore.searchQuery.trim() && $eventsStore.pendingRequest}
		<p class="text-text-muted text-sm">Aan het zoeken...</p>
	{/if}

	{#if $eventsStore.filteredEvents.length === 0 && !$eventsStore.pendingRequest}
		<p class="text-text-muted text-sm">Geen activiteiten gevonden voor deze zoekopdracht.</p>
	{/if}

	{#if !$eventsStore.searchQuery.trim()}
		<button
			class="outline-ribbook-yellow text-ribbook-yellow flex h-[42px] w-[224px] items-center justify-center gap-2.5 rounded outline-2 -outline-offset-1"
			onclick={getEvents}
			disabled={$eventsStore.pendingRequest || $eventsStore.noMoreEvents}
		>
			{loadMoreButtonText}
		</button>
	{/if}
</div>
