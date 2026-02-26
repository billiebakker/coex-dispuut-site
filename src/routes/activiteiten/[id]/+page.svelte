<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import EventAttendeesList from '$lib/components/Events/EventAttendeesList.svelte';
	import EventSignUpButton from '$lib/components/Events/EventSignUpButton.svelte';
	import { eventsStore, type EventItem } from '$lib/stores/events';

	let event = $state<EventItem | null>(null);
	let pendingRequest = $state(true);
	let error = $state('');
	let showAttendeeList = $state(false);

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

	function toggleAttendeeList() {
		showAttendeeList = !showAttendeeList;
	}

	onMount(async () => {
		const eventId = page.params.id;
		if (!eventId) {
			error = 'Evenement niet gevonden';
			pendingRequest = false;
			return;
		}

		const fetchedEvent = await eventsStore.fetchEventById(eventId);
		if (!fetchedEvent) {
			error = 'Evenement niet gevonden';
			pendingRequest = false;
			return;
		}

		event = fetchedEvent;
		pendingRequest = false;
	});
</script>

{#if event && showAttendeeList}
	<EventAttendeesList {event} onClose={toggleAttendeeList} />
{/if}

<div class="flex h-full w-full flex-col">
	{#if pendingRequest}
		<div class="py-8 text-gray-600">Aan het laden...</div>
	{:else if error}
		<div class="py-8 text-red-500">{error}</div>
	{:else if event}
		<div class="min-h-0 flex-1 overflow-auto">
			<div class="sticky top-0 z-0">
				{#if event.headerImage}
					<img src={event.headerImage} alt="" class="h-[222px] w-full object-cover" />
				{:else}
					<div class="to-ribbook-pink h-[222px] w-full bg-gradient-to-t from-transparent"></div>
				{/if}
			</div>

			<div class="px-2">
				<div
					class="outline-ribbook-red relative z-10 mx-auto -mt-6 mb-2 flex w-full max-w-2xl flex-col gap-3 rounded-xl bg-white p-4 outline-3"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="material-symbols-rounded icon icon-gray">calendar_month</span>
							<p class="text-main-medium-gray text-sm font-normal">
								{new Date(event.date).toLocaleDateString('nl-NL', {
									weekday: 'long',
									day: 'numeric',
									month: 'long'
								})}, om
								{new Date(event.date).toLocaleTimeString('nl-NL', {
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
						<span class="text-ribbook-red text-sm font-semibold">{getTimeAgo(event.date)}</span>
					</div>

					<h1 class="text-2xl font-semibold">{event.title}</h1>

					<div class="flex flex-col gap-1">
						<div class="border-t border-gray-300"></div>
						<div class="text-ribbook-dark-gray flex flex-wrap items-center justify-between text-sm">
							<div class="flex items-center gap-2 p-2">
								<span class="material-symbols-rounded icon icon-gray">location_on</span>
								<span>{event.location || 'geen locatie'}</span>
							</div>

							<button
								onclick={toggleAttendeeList}
								class="hover:bg-bg-light flex items-center gap-2 rounded-md p-2 transition-all duration-200 ease-in-out"
							>
								<span class="material-symbols-rounded icon icon-gray">group</span>
								<span>{event.attendeeCount} aanmeldingen</span>
							</button>
						</div>
						<div class="border-t border-gray-300"></div>
					</div>

					<div class="flex flex-col gap-3">
						<p>{event.description}</p>
						<p class="text-sm font-normal text-gray-600">
							Geplaatst door {event.userDisplayName || 'onbekend'} op
							{new Date(event.datePosted).toLocaleDateString('nl-NL', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})},
							{new Date(event.datePosted).toLocaleTimeString('nl-NL', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</p>
					</div>
				</div>
			</div>
		</div>

		<EventSignUpButton {event} />
	{/if}
</div>
