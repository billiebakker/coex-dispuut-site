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
	let now = $state(new Date());

	const signupDeadline = $derived(new Date(event.signupDeadline));
	const deadlineHasPassed = $derived(signupDeadline.getTime() <= now.getTime());

	const countdownText = $derived.by(() => {
		if (deadlineHasPassed) return '';

		const msRemaining = signupDeadline.getTime() - now.getTime();
		const totalMinutes = Math.floor(msRemaining / 60000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		const isToday = signupDeadline.toDateString() === now.toDateString();

		if (isToday || totalMinutes < 24 * 60) {
			return `${hours} uur, ${minutes} min`;
		}

		const days = Math.floor(totalMinutes / (24 * 60));
		const remainingHours = Math.floor((totalMinutes - days * 24 * 60) / 60);
		const dayLabel = days === 1 ? 'dag' : 'dagen';

		if (remainingHours === 0) {
			return `${days} ${dayLabel}`;
		}

		return `${days} ${dayLabel}, ${remainingHours} uur`;
	});

	const buttonColor = $derived.by(() => {
		if (deadlineHasPassed) return 'bg-gray-400 cursor-not-allowed';
		return isSignedUp ? 'bg-green-700 hover:bg-green-600' : 'bg-ribbook-red hover:bg-red-400';
	});

	const buttonText = $derived.by(() => {
		if (isSignedUp && !deadlineHasPassed) {
			return {
				top: 'Je bent aangemeld :) Aanpassen of afmelden?',
				bottom: 'Kan nog',
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

	onMount(() => {
		const intervalId = window.setInterval(() => {
			now = new Date();
		}, 30000);

		(async () => {
			pendingRequest = true;
			isSignedUp = await eventsStore.userAlreadySignedUp(event);
			pendingRequest = false;
		})();

		return () => {
			window.clearInterval(intervalId);
		};
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
					{countdownText}
				{/if}
			</span>
		</button>
	{:else}
		<div>een momentje....</div>
	{/if}
</div>
