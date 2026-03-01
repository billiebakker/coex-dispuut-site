<script lang="ts">
	import { goto } from '$app/navigation';
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import imageCompression from 'browser-image-compression';
	import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
	import { storage } from '$lib/firebase/client/config.client';
	import { eventsStore, type FoodOption } from '$lib/stores/events';
	import { onMount } from 'svelte';

	interface EventFormValues {
		title: string;
		description: string;
		location: string;
		date: string;
		deadlineInHoursToEvent: number;
		foodOption: FoodOption;
	}

	interface ImageUpload {
		task: UploadTask;
		name: string;
		progress: number;
		url: string | null;
		status: 'uploading' | 'done' | 'error';
	}

	const eventSchema = yup.object({
		title: yup.string().required('Titel is verplicht').min(3).max(100),
		description: yup.string().required('Beschrijving is verplicht').min(2).max(1200),
		location: yup.string().required('Locatie is verplicht').min(2).max(100),
		date: yup.string().required('Datum en tijd is verplicht'),
		deadlineInHoursToEvent: yup.number().required('Deadline is verplicht').min(0.5),
		foodOption: yup
			.mixed<FoodOption>()
			.oneOf(['no_food', 'veg', 'veg_and_meat'])
			.required('Eten keuze is verplicht')
	});

	let eventInSubmission = $state(false);
	let eventShowAlert = $state(false);
	let eventAlertVariant = $state('bg-blue-800');
	let eventAlertMessage = $state('even wachten...');

	let drinkOptions = $state(['Bier', 'Wijn', 'Fris', 'Cocktail']);
	let newDrink = $state('');
	let selectedDrinkOptions = $state<string[]>([]);
	let selectedFoodOption = $state<FoodOption>('no_food');

	let isDragover = $state(false);
	let imageUpload = $state<ImageUpload | null>(null);
	let defaultDateTime = $state('');

	let fileInput: HTMLInputElement | null = null;

	const { form, errors, setFields, reset } = createForm({
		onSubmit: async (values) => {
			await submitEvent(values as unknown as EventFormValues);
		},
		extend: validator({ schema: eventSchema })
	});

	function toDateTimeLocalValue(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function addDrink() {
		const drink = newDrink.trim();
		if (drink && !drinkOptions.includes(drink)) {
			drinkOptions = [...drinkOptions, drink];
			selectedDrinkOptions = [...selectedDrinkOptions, drink];
			newDrink = '';
		}
	}

	function autoResize(event: Event) {
		const textarea = event.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	async function uploadImage(event: DragEvent | Event) {
		isDragover = false;

		const file =
			'dataTransfer' in event
				? event.dataTransfer?.files?.[0]
				: (event.target as HTMLInputElement).files?.[0];

		if (!file) return;

		if (!file.type.startsWith('image/')) {
			window.alert('Alleen afbeeldingen zijn toegestaan!');
			return;
		}

		let compressedFile: File;
		try {
			compressedFile = await imageCompression(file, {
				maxSizeMB: 0.5,
				maxWidthOrHeight: 1920,
				useWebWorker: true
			});
		} catch (compressionError) {
			console.error('Image compression failed:', compressionError);
			return;
		}

		const uniqueName = `${Date.now()}_${file.name}`;
		const imageRef = ref(storage, `event-images/${uniqueName}`);
		const task = uploadBytesResumable(imageRef, compressedFile);

		imageUpload = {
			task,
			name: file.name,
			progress: 0,
			url: null,
			status: 'uploading'
		};

		task.on(
			'state_changed',
			(snapshot) => {
				if (!imageUpload) return;
				imageUpload = {
					...imageUpload,
					progress: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
				};
			},
			(uploadError) => {
				console.error('Upload failed:', uploadError);
				if (!imageUpload) return;
				imageUpload = { ...imageUpload, status: 'error' };
			},
			async () => {
				if (!imageUpload) return;
				try {
					const downloadURL = await getDownloadURL(task.snapshot.ref);
					imageUpload = { ...imageUpload, url: downloadURL, status: 'done' };
				} catch (downloadError) {
					console.error('Could not get download URL:', downloadError);
					imageUpload = { ...imageUpload, status: 'error' };
				}
			}
		);
	}

	async function submitEvent(values: EventFormValues) {
		eventInSubmission = true;
		eventShowAlert = true;
		eventAlertVariant = 'bg-ribbook-pink';
		eventAlertMessage = 'ok wacht even...';

		try {
			const eventDate = new Date(values.date);
			await eventsStore.createEvent({
				title: values.title,
				date: eventDate,
				description: values.description,
				location: values.location,
				deadlineInHoursToEvent: Number(values.deadlineInHoursToEvent),
				foodOption: values.foodOption,
				drinkOptions: selectedDrinkOptions,
				headerImage: imageUpload?.url || null
			});

			eventInSubmission = false;
			eventAlertVariant = 'bg-green-500';
			eventAlertMessage = 'event is aangemaakt!';

			selectedDrinkOptions = [];
			reset();

			await goto('/activiteiten');
		} catch (createError) {
			console.error(createError);
			eventInSubmission = false;
			eventAlertVariant = 'bg-red-500';
			eventAlertMessage = 'Er ging iets mis bij het aanmaken';
		}
	}

	onMount(() => {
		const initialDate = new Date();
		initialDate.setDate(initialDate.getDate() + 2);
		initialDate.setHours(18, 0, 0, 0);
		defaultDateTime = toDateTimeLocalValue(initialDate);

		setFields('deadlineInHoursToEvent', 2);
		setFields('foodOption', 'no_food');
		setFields('date', defaultDateTime);
		selectedFoodOption = 'no_food';
	});
</script>

<svelte:window
	onbeforeunload={() => {
		if (imageUpload?.task) imageUpload.task.cancel();
	}}
/>

<section
	class="flex w-full flex-1 flex-col items-center justify-start gap-2.5 overflow-auto px-2.5 py-1"
>
	<div
		class="outline-ribbook-pink flex w-full max-w-3xl flex-col items-center gap-2.5 rounded-lg bg-white p-3 py-1 outline-3"
	>
		<form use:form class="flex w-full flex-1 flex-col gap-2.5">
			<div>
				<label for="title">Titel</label>
				<input
					name="title"
					placeholder="Super Coole Activiteit"
					class="bg-bg-light text-text-muted w-full resize-none rounded-lg px-3 py-2 text-base font-normal focus:outline-none"
				/>
				{#if $errors.title}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.title}</p>
				{/if}
			</div>

			<div>
				<label for="description">Beschrijving</label>
				<textarea
					name="description"
					placeholder="de bedoeling van deze activiteit? zuipen ofzo?????"
					class="bg-bg-light text-text-muted w-full resize-none rounded-lg px-3 py-2 text-base font-normal focus:outline-none"
					oninput={autoResize}
				></textarea>
				{#if $errors.description}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.description}</p>
				{/if}
			</div>

			<div>
				<label for="imageUploadInput" class="block pb-2">Afbeelding toevoegen</label>
				<div
					class="border-ribbook-pink hover:bg-ribbook-pink hover:border-ribbook-pink w-full cursor-pointer rounded border text-center text-gray-400 transition duration-150 hover:text-white"
					class:bg-ribbook-pink={isDragover}
					role="button"
					tabindex="0"
					ondrag={(event) => {
						event.preventDefault();
						event.stopPropagation();
					}}
					ondragstart={(event) => {
						event.preventDefault();
						event.stopPropagation();
					}}
					ondragend={(event) => {
						event.preventDefault();
						event.stopPropagation();
						isDragover = false;
					}}
					ondragover={(event) => {
						event.preventDefault();
						event.stopPropagation();
						isDragover = true;
					}}
					ondragenter={(event) => {
						event.preventDefault();
						event.stopPropagation();
						isDragover = true;
					}}
					ondragleave={(event) => {
						event.preventDefault();
						event.stopPropagation();
						isDragover = false;
					}}
					ondrop={uploadImage}
					onclick={() => fileInput?.click()}
					onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && fileInput?.click()}
				>
					{#if !imageUpload}
						<p class="p-6">sleep een afbeelding hierheen of klik om te kiezen</p>
					{:else if imageUpload.status === 'uploading'}
						<p class="p-6">ok even wachten...</p>
					{:else if imageUpload.status === 'done' && imageUpload.url}
						<img src={imageUpload.url} alt="" />
					{:else if imageUpload.status === 'error'}
						<p class="p-6">iets mis gegaan helaas, probeer nog eens??</p>
					{/if}
				</div>

				<input
					id="imageUploadInput"
					bind:this={fileInput}
					type="file"
					accept="image/*"
					onchange={uploadImage}
					class="hidden"
				/>

				{#if imageUpload}
					<div class="mt-2">
						<div class="text-sm font-bold">{imageUpload.name}</div>
						<div class="flex h-3 overflow-hidden rounded bg-gray-200">
							<div
								class="transition-all"
								class:bg-ribbook-pink={imageUpload.status === 'uploading'}
								class:bg-green-500={imageUpload.status === 'done'}
								class:bg-red-500={imageUpload.status === 'error'}
								style={`width: ${imageUpload.progress}%`}
							></div>
						</div>
					</div>
				{/if}
			</div>

			<div>
				<label for="location">Locatie</label>
				<input
					name="location"
					placeholder="waar? of digitaal maybe (cringe)?"
					class="bg-bg-light text-text-muted w-full resize-none rounded-lg px-3 py-2 text-base font-normal focus:outline-none"
				/>
				{#if $errors.location}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.location}</p>
				{/if}
			</div>

			<div>
				<label for="date">Datum en tijd</label>
				<input
					id="date"
					name="date"
					type="datetime-local"
					bind:value={defaultDateTime}
					class="w-full rounded-md border border-gray-300 p-2"
				/>
				{#if $errors.date}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.date}</p>
				{/if}
			</div>

			<div>
				<label for="deadlineInHoursToEvent">Inschrijf deadline: hoeveel uur van tevoren?</label>
				<div class="flex items-center gap-2">
					<input
						type="number"
						name="deadlineInHoursToEvent"
						min="0.5"
						step="0.5"
						class="rounded-md border border-gray-300 p-2"
						placeholder="aantal uur"
					/>
				</div>
				{#if $errors.deadlineInHoursToEvent}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.deadlineInHoursToEvent}</p>
				{/if}
			</div>

			<div>
				<p class="block pb-2">Eten?</p>
				<div class="flex gap-2">
					<label
						class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center transition-all duration-150 ease-in-out"
					>
						<input
							id="foodOptionNone"
							type="radio"
							name="foodOption"
							value="no_food"
							class="hidden"
							checked={selectedFoodOption === 'no_food'}
							onchange={() => {
								selectedFoodOption = 'no_food';
								setFields('foodOption', 'no_food');
							}}
						/>
						<span
							class="block rounded-lg border px-3 py-2"
							class:bg-ribbook-pink={selectedFoodOption === 'no_food'}
							class:border-dark-gray={selectedFoodOption === 'no_food'}
							class:bg-gray-100={selectedFoodOption !== 'no_food'}
							class:text-gray-700={selectedFoodOption !== 'no_food'}
							class:border-gray-100={selectedFoodOption !== 'no_food'}
						>
							Geen eten
						</span>
					</label>

					<label
						class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center transition-all duration-150 ease-in-out"
					>
						<input
							type="radio"
							name="foodOption"
							value="veg"
							class="hidden"
							checked={selectedFoodOption === 'veg'}
							onchange={() => {
								selectedFoodOption = 'veg';
								setFields('foodOption', 'veg');
							}}
						/>
						<span
							class="block rounded-lg border px-3 py-2"
							class:bg-ribbook-pink={selectedFoodOption === 'veg'}
							class:border-dark-gray={selectedFoodOption === 'veg'}
							class:bg-gray-100={selectedFoodOption !== 'veg'}
							class:text-gray-700={selectedFoodOption !== 'veg'}
							class:border-gray-100={selectedFoodOption !== 'veg'}
						>
							Vega
						</span>
					</label>

					<label
						class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center transition-all duration-150 ease-in-out"
					>
						<input
							type="radio"
							name="foodOption"
							value="veg_and_meat"
							class="hidden"
							checked={selectedFoodOption === 'veg_and_meat'}
							onchange={() => {
								selectedFoodOption = 'veg_and_meat';
								setFields('foodOption', 'veg_and_meat');
							}}
						/>
						<span
							class="block rounded-lg border px-3 py-2"
							class:bg-ribbook-pink={selectedFoodOption === 'veg_and_meat'}
							class:border-dark-gray={selectedFoodOption === 'veg_and_meat'}
							class:bg-gray-100={selectedFoodOption !== 'veg_and_meat'}
							class:text-gray-700={selectedFoodOption !== 'veg_and_meat'}
							class:border-gray-100={selectedFoodOption !== 'veg_and_meat'}
						>
							Vega + vlees
						</span>
					</label>
				</div>
				{#if $errors.foodOption}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.foodOption}</p>
				{/if}
			</div>

			<div>
				<p class="block pb-2">Drankjes?</p>
				<div class="flex flex-wrap gap-2">
					{#each drinkOptions as drink (drink)}
						<label class="flex-1 cursor-pointer rounded-lg px-3 py-2 text-center">
							<input
								type="checkbox"
								name="drinks"
								value={drink}
								class="hidden"
								onchange={(event) => {
									if ((event.target as HTMLInputElement).checked) {
										if (!selectedDrinkOptions.includes(drink)) {
											selectedDrinkOptions = [...selectedDrinkOptions, drink];
										}
									} else {
										selectedDrinkOptions = selectedDrinkOptions.filter((d) => d !== drink);
									}
								}}
							/>
							<span
								class="block rounded-lg border px-3 py-2"
								class:bg-ribbook-pink={selectedDrinkOptions.includes(drink)}
								class:border-dark-gray={selectedDrinkOptions.includes(drink)}
								class:text-white={selectedDrinkOptions.includes(drink)}
								class:bg-gray-100={!selectedDrinkOptions.includes(drink)}
								class:text-gray-700={!selectedDrinkOptions.includes(drink)}
								class:border-gray-100={!selectedDrinkOptions.includes(drink)}
							>
								{drink}
							</span>
						</label>
					{/each}
				</div>

				<div class="mt-3 flex items-center gap-2">
					<input
						bind:value={newDrink}
						placeholder="Ander soort drinken aanwezig?"
						class="flex-1 rounded-lg border px-3 py-2"
						onkeydown={(event) => event.key === 'Enter' && addDrink()}
					/>
					<button
						type="button"
						class="rounded-lg bg-green-500 px-3 py-2 text-white"
						onclick={addDrink}
					>
						+
					</button>
				</div>
			</div>

			{#if eventShowAlert}
				<div class="flex w-full gap-2.5 rounded-md px-1.5 {eventAlertVariant}">
					{eventAlertMessage}
				</div>
			{/if}

			<button
				type="submit"
				disabled={eventInSubmission}
				class="bg-ribbook-red my-1 flex h-10 cursor-pointer items-center justify-center gap-3 rounded-lg px-2.5"
			>
				<span class="text-ribbook-yellow text-sm font-semibold">Activiteit aanmaken!</span>
				<span class="material-symbols-rounded icon icon-yellow">calendar_add_on</span>
			</button>
		</form>
	</div>
</section>
