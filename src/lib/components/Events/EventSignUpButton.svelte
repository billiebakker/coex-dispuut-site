<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { eventsStore, type EventItem } from '$lib/stores/events';

	interface Props {
		event: EventItem;
	}

	let { event }: Props = $props();

	let isSignedUp = $state(false);
	let pendingRequest = $state(true);

	const deadlineHasPassed = $derived(new Date(event.signupDeadline) < new Date());

	const buttonColor = $derived.by(() => {
		if (deadlineHasPassed) return 'bg-gray-400 cursor-not-allowed';
		return isSignedUp ? 'bg-green-700 hover:bg-green-600' : 'bg-ribbook-red hover:bg-red-400';
	});

	const buttonText = $derived.by(() => {
		if (isSignedUp && !deadlineHasPassed) {
			return {
				top: 'Je bent aangemeld :) Aanpassen of afmelden?',
				bottom: 'Kan nog tot',
				showTime: true
			};
		}

		if (isSignedUp && deadlineHasPassed) {
			return {
				top: 'Je bent aangemeld!',
				bottom: 'Je kan niet meer aanpassen, inschrijving is gesloten.',
				showTime: false
			};
		}

		if (!isSignedUp && !deadlineHasPassed) {
			return {
				top: 'AANMELDEN!!',
				bottom: 'Aanmelding sluit over',
				showTime: true
			};
		}

		if (!isSignedUp && deadlineHasPassed) {
			return {
				top: 'Aanmelding is gesloten :(',
				bottom: 'jammerdebammer',
				showTime: false
			};
		}

		return { top: 'huh', bottom: 'idk', showTime: false };
	});

	onMount(async () => {
		pendingRequest = true;
		isSignedUp = await eventsStore.userAlreadySignedUp(event);
		pendingRequest = false;
	});

	function goToSignUp() {
		if (deadlineHasPassed) return;
		goto(`/activiteiten/aanmelden/${event.docID}`);
	}
</script>

<div class="mx-auto">
	{#if !pendingRequest}
		<button
			disabled={deadlineHasPassed}
			class="border-ribbook-yellow mx-2 flex max-w-2xl flex-col items-center justify-between rounded-lg border-2 px-5 py-2 transition-all duration-200 ease-in-out {buttonColor}"
			onclick={goToSignUp}
		>
			<span class="text-ribbook-yellow text-lg font-semibold">{buttonText.top}</span>
			<span class="text-ribbook-yellow text-sm"
				>{buttonText.bottom}
				{#if buttonText.showTime}
					{new Date(event.signupDeadline).toLocaleTimeString('nl-NL', {
						hour: '2-digit',
						minute: '2-digit'
					})}
				{/if}
			</span>
		</button>
	{:else}
		<div>een momentje....</div>
	{/if}
</div>
