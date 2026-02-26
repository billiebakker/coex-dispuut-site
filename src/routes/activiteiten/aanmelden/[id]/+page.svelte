<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import { onMount } from 'svelte';
	import { eventsStore, type EventItem, type EventSignUp } from '$lib/stores/events';
	import { userStore } from '$lib/stores/user';

	let event = $state<EventItem | null>(null);
	let pendingRequest = $state(true);
	let error = $state('');

	let confirmUnsubscribe = $state(false);
	let signupInSubmission = $state(false);
	let signupShowAlert = $state(false);
	let signupAlertVariant = $state('bg-blue-800');
	let signupAlertMessage = $state('even wachten...');

	const signUpSchema = yup.object({
		allergies: yup
			.string()
			.max(100, 'Allergieën mag maximaal 100 tekens zijn')
			.matches(/^[a-zA-ZÀ-ÿ\s-]*$/, 'Alleen letters, spaties en streepjes')
	});

	const userChoices = $derived.by(() => {
		if (!event || !$userStore.currentUser) return null;
		return (event.signUps?.[$userStore.currentUser.uid] || null) as EventSignUp | null;
	});

	const userAlreadySignedUp = $derived(!!userChoices);

	const { form, errors, setFields } = createForm({
		onSubmit: async (values) => {
			await submitSignUp(values as Record<string, string>);
		},
		extend: validator({ schema: signUpSchema })
	});

	async function submitSignUp(formValues: Record<string, string>) {
		if (!event) return;

		try {
			signupInSubmission = true;
			signupShowAlert = true;
			signupAlertVariant = 'bg-blue-800';
			signupAlertMessage = 'even wachten...';

			await eventsStore.signUpOrUpdate(event, formValues);

			signupInSubmission = false;
			signupAlertVariant = 'bg-green-500';
			signupAlertMessage = 'Yay gelukt!';

			await goto(`/activiteiten/${event.docID}`);
		} catch (submitError) {
			console.error(submitError);
			signupInSubmission = false;
			signupAlertVariant = 'bg-red-500';
			signupAlertMessage = 'Er is een fout opgetreden :(((';
		}
	}

	async function unsubscribe() {
		if (!event) return;

		if (!confirmUnsubscribe) {
			confirmUnsubscribe = true;
			return;
		}

		signupAlertVariant = 'bg-blue-800';
		signupAlertMessage = 'even wachten...';
		signupInSubmission = true;
		signupShowAlert = true;

		await eventsStore.removeSignUp(event);
		await goto(`/activiteiten/${event.docID}`);
	}

	onMount(async () => {
		const eventId = page.params.id;
		if (!eventId) {
			error = 'Evenement niet gevonden';
			pendingRequest = false;
			return;
		}

		confirmUnsubscribe = false;
		const fetchedEvent = await eventsStore.fetchEventById(eventId);
		if (!fetchedEvent) {
			error = 'Evenement niet gevonden';
			pendingRequest = false;
			return;
		}

		event = fetchedEvent;
		pendingRequest = false;

		const initialDrink = userChoices?.drinkChoice || 'geen drinken';
		setFields('foodChoice', userChoices?.foodChoice || 'no_food_choice');
		setFields('drinkChoice', initialDrink);
		setFields('allergies', userChoices?.allergies || '');
	});
</script>

<section
	class="flex w-full flex-1 flex-col items-center justify-start gap-2.5 overflow-auto px-2.5 py-1"
>
	{#if pendingRequest}
		<div>laden</div>
	{:else if error}
		<div class="text-ribbook-yellow">{error}</div>
	{:else if event}
		<div
			class="outline-ribbook-pink flex w-full max-w-3xl flex-col items-center gap-2.5 rounded-lg bg-white p-2 py-1 outline-3"
		>
			<h1 class="text-text-muted text-2xl font-semibold">
				{userAlreadySignedUp ? 'Keuzes voor ' : 'Aanmelden voor '}
				<span class="text-ribbook-red">{event.title}</span>
				{userAlreadySignedUp ? 'aanpassen' : ''}
			</h1>

			{#if event.foodOption === 'no_food' && !event.drinkOptions?.length}
				<div>
					Dit event heeft geen eten of drinken!!!! Wat gaan we doen??? idk!!! schrijf je nu in
					yippie!!
				</div>
			{/if}

			<form use:form class="flex w-full flex-1 flex-col gap-2.5">
				{#if event.foodOption !== 'no_food'}
					<div>
						<p class="block pb-2">Wat wil je eten?</p>
						<div class="flex gap-2">
							<label class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center">
								<input type="radio" name="foodChoice" value="no_food_choice" class="hidden" />
								<span class="bg-ribbook-pink border-dark-gray block rounded-lg border px-3 py-2"
									>Geen eten</span
								>
							</label>

							<label class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center">
								<input type="radio" name="foodChoice" value="veg_choice" class="hidden" />
								<span class="bg-ribbook-pink border-dark-gray block rounded-lg border px-3 py-2"
									>Vega</span
								>
							</label>

							{#if event.foodOption === 'veg_and_meat'}
								<label class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center">
									<input type="radio" name="foodChoice" value="meat_choice" class="hidden" />
									<span class="bg-ribbook-pink border-dark-gray block rounded-lg border px-3 py-2"
										>Vlees</span
									>
								</label>
							{/if}
						</div>
					</div>

					<div>
						<label for="allergies" class="block pb-2">Heb je allergieën?</label>
						<input
							name="allergies"
							type="text"
							placeholder="vul hier je allergieën in (of niet)"
							class="bg-bg-light text-text-muted w-full resize-none rounded-lg px-3 py-2 text-base font-normal focus:outline-none"
						/>
						{#if $errors.allergies}
							<p class="text-ribbook-red mt-1 block text-sm">{$errors.allergies}</p>
						{/if}
					</div>
				{/if}

				{#if event.drinkOptions}
					<div>
						<p class="block pb-2">Wat wil je drinken?</p>
						<div class="flex flex-wrap gap-2">
							{#each ['geen drinken', ...(event.drinkOptions || [])] as drink (drink)}
								<label class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center">
									<input type="radio" name="drinkChoice" value={drink} class="hidden" />
									<span class="bg-ribbook-pink border-dark-gray block rounded-lg border px-3 py-2"
										>{drink}</span
									>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				{#if signupShowAlert}
					<div class="flex w-full gap-2.5 rounded-md px-1.5 {signupAlertVariant}">
						{signupAlertMessage}
					</div>
				{/if}

				<button
					type="submit"
					disabled={signupInSubmission}
					class="bg-ribbook-red my-1 flex h-12 cursor-pointer items-center justify-center gap-1 rounded-lg px-2.5 hover:bg-red-800"
				>
					<span class="text-ribbook-yellow text-sm font-semibold"
						>{userAlreadySignedUp ? 'Aanpassen!' : 'Aanmelden!'}</span
					>
					<span class="material-symbols-rounded icon icon-yellow">login</span>
				</button>

				{#if userAlreadySignedUp}
					<button
						type="button"
						onclick={unsubscribe}
						class="my-1 flex h-12 cursor-pointer items-center justify-center gap-1 rounded-lg bg-gray-600 px-2.5 hover:bg-gray-700"
					>
						<span class="text-sm font-semibold text-white"
							>{confirmUnsubscribe
								? 'echt???? saai. jammer. druk nogmaals op deze knop om af te melden :(((('
								: 'Afmelden :('}</span
						>
					</button>
				{/if}
			</form>
		</div>
	{/if}
</section>
