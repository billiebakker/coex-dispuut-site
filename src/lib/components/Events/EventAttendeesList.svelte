<script lang="ts">
	import type { EventItem } from '$lib/stores/events';

	interface Attendee {
		uid: string;
		displayName: string;
		foodChoice: string | null;
		drinkChoice: string | null;
		allergies: string | null;
	}

	interface Props {
		event: EventItem;
		onClose: () => void;
	}

	let { event, onClose }: Props = $props();

	const foodLabels: Record<string, string> = {
		no_food_choice: 'geen',
		veg_choice: 'veg',
		meat_choice: 'vlees'
	};

	const attendees = $derived.by(() => {
		if (!event.signUps) return [] as Attendee[];
		return Object.entries(event.signUps).map(([uid, attendee]) => ({
			uid,
			displayName: attendee.displayName,
			foodChoice: attendee.foodChoice,
			drinkChoice: attendee.drinkChoice,
			allergies: attendee.allergies
		}));
	});

	const totals = $derived.by(() => {
		const foodTotals: Record<string, number> = {};
		const drinkTotals: Record<string, number> = {};

		for (const attendee of attendees) {
			if (attendee.foodChoice) {
				const label = foodLabels[attendee.foodChoice] || attendee.foodChoice;
				foodTotals[label] = (foodTotals[label] || 0) + 1;
			}

			if (attendee.drinkChoice) {
				drinkTotals[attendee.drinkChoice] = (drinkTotals[attendee.drinkChoice] || 0) + 1;
			}
		}

		return { foodTotals, drinkTotals };
	});

	function foodLabel(choice: string | null) {
		if (!choice) return '-';
		return foodLabels[choice] || choice;
	}
</script>

<div
	class="fixed z-50 flex h-full w-full items-center justify-center"
	onclick={onClose}
	onkeydown={(event) => event.key === 'Escape' && onClose()}
	role="button"
	tabindex="0"
>
	<div
		class="border-ribbook-pink mx-4 h-full w-full max-w-3xl overflow-y-scroll rounded-xl border-5 bg-white p-2"
		onclick={(event) => event.stopPropagation()}
		onkeydown={(event) => event.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="mb-4 text-xl font-bold">{event.title}</h2>
			<button
				onclick={onClose}
				class="hover:bg-ribbook-pink flex h-12 w-12 items-center justify-center rounded-lg"
			>
				<span class="material-symbols-rounded icon">close</span>
			</button>
		</div>

		{#if attendees.length}
			<div class="mb-6">
				<h3 class="mb-2 font-semibold">overzichtje</h3>
				<div class="flex flex-col gap-1 text-sm">
					{#if event.foodOption !== 'no_food'}
						<div>
							<span class="font-medium">Eten:</span>
							{#each Object.entries(totals.foodTotals) as [choice, count]}
								<span class="ml-2">{choice}: {count},</span>
							{/each}
						</div>
					{/if}
					<div>
						<span class="font-medium">Drinken:</span>
						{#each Object.entries(totals.drinkTotals) as [choice, count]}
							<span class="ml-2">{choice}: {count},</span>
						{/each}
					</div>
				</div>
			</div>

			<table class="w-full border-collapse text-left">
				<thead>
					<tr class="bg-gray-100">
						<th class="border-b px-3 py-2">naam</th>
						{#if event.foodOption !== 'no_food'}
							<th class="border-b px-3 py-2">eten</th>
						{/if}
						<th class="border-b px-3 py-2">drinken</th>
						{#if event.foodOption !== 'no_food'}
							<th class="border-b px-3 py-2">allergieën</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each attendees as attendee (attendee.uid)}
						<tr class="hover:bg-gray-50">
							<td class="border-b px-3 py-2">{attendee.displayName}</td>
							{#if event.foodOption !== 'no_food'}
								<td class="border-b px-3 py-2">{foodLabel(attendee.foodChoice)}</td>
							{/if}
							<td class="border-b px-3 py-2">{attendee.drinkChoice || '-'}</td>
							{#if event.foodOption !== 'no_food'}
								<td class="border-b px-3 py-2">{attendee.allergies || '-'}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div>Geen aanmeldingen</div>
		{/if}
	</div>
</div>
