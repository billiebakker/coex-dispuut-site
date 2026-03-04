<script lang="ts">
	import { userStore } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import ProfilePicture from '$lib/components/common/ProfilePicture.svelte';
	import { storage } from '$lib/firebase/client/storage.client';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

	let showAlert = $state(false);
	let alertVariant = $state('bg-blue-800');
	let alertMessage = $state('');
	let submitting = $state(false);
	let uploadingImage = $state(false);

	const accountSchema = yup.object({
		displayName: yup
			.string()
			.required('Voornaam is vereist!')
			.min(1, 'Voornaam is vereist!')
			.max(80, 'Voornaam is te lang, maximaal 80 karakters!'),
		allergies: yup.string().max(100, 'Allergieën veld is te lang, maximaal 100 karakters!')
	});

	const { form, errors } = createForm({
		onSubmit: async (values) => {
			await handleSubmit(values as { displayName: string; allergies: string });
		},
		extend: validator({ schema: accountSchema }),
		initialValues: {
			displayName: $userStore.userProfile?.displayName || '',
			allergies: $userStore.userProfile?.allergies || ''
		}
	});

	// PROFIELFOTO UPLOAD
	async function handleProfilePictureUpload(file: File) {
		uploadingImage = true;
		showAlert = true;
		alertVariant = 'bg-blue-800';
		alertMessage = 'Foto aan het uploaden...';

		try {
			const user = $userStore.currentUser;
			if (!user) throw new Error('Geen gebruiker ingelogd');

			const imgRef = ref(storage, `profile-pictures/${user.uid}_${Date.now()}.jpg`);
			await uploadBytes(imgRef, file);
			const url = await getDownloadURL(imgRef);

			await userStore.updateProfile({ photoURL: url });

			alertVariant = 'bg-green-500';
			alertMessage = 'Foto opgeslagen!';
		} catch (error) {
			console.error('Image upload failed:', error);
			alertVariant = 'bg-red-500';
			alertMessage = 'Oei, upload mislukt! Probeer opnieuw.';
		} finally {
			uploadingImage = false;
		}
	}

	async function handleSubmit(values: { displayName: string; allergies: string }) {
		showAlert = true;
		submitting = true;
		alertVariant = 'bg-blue-800';
		alertMessage = 'Even wachten...';

		try {
			await userStore.updateProfile({
				displayName: values.displayName,
				allergies: values.allergies || ''
			});

			alertVariant = 'bg-green-500';
			alertMessage = 'Profiel succesvol opgeslagen!';
			submitting = false;
		} catch (error) {
			submitting = false;
			alertVariant = 'bg-red-500';
			alertMessage = 'Oei, wat fout gegaan! Probeer alsjeblieft opnieuw.';
			console.error(error);
		}
	}

	async function handleLogout() {
		try {
			await userStore.logout();
			goto('/login');
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}
</script>

<section class="flex w-full flex-1 flex-col items-center gap-6 overflow-auto px-2.5! py-4!">
	<div
		class="outline-ribbook-yellow flex w-full max-w-2xl flex-wrap items-center justify-center gap-6 rounded-lg bg-white px-6! py-4! outline-3"
	>
		<!-- PFP + NAAM -->
		<div class="flex flex-col items-center gap-3!">
			<ProfilePicture
				photoURL={$userStore.userProfile?.photoURL}
				size="large"
				writeable={true}
				onUpload={handleProfilePictureUpload}
			/>
			<p class="font-roboto text-text-muted text-center text-lg font-semibold">
				{$userStore.userProfile?.displayName || 'Geen naam ingesteld'}
			</p>
		</div>

		<!-- PROFIEL FORM -->
		<form use:form class="flex min-w-57.5 flex-1 flex-col gap-2.5">
			<div class="w-full">
				<label for="displayName" class="mb-1 block font-medium">Voornaam (of bijnaam)</label>
				<input
					name="displayName"
					type="text"
					placeholder="naam die op posts verschijnt"
					class="bg-bg-light! text-text-muted! w-full! rounded-lg! px-3! py-2! text-base! font-normal! focus:outline-none!"
				/>
				{#if $errors.displayName}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.displayName}</p>
				{/if}
			</div>

			<div class="w-full">
				<label for="allergies" class="mb-1 block font-medium">Allergieën</label>
				<input
					name="allergies"
					type="text"
					placeholder="pinda's of gluten of schaaldieren ofzo"
					class="bg-bg-light! text-text-muted! w-full! rounded-lg! px-3! py-2! text-base! font-normal! focus:outline-none!"
				/>
				{#if $errors.allergies}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.allergies}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={submitting || uploadingImage}
				class="bg-ribbook-red! my-1! flex h-10! cursor-pointer! items-center! justify-center! gap-3! rounded-lg! px-2.5! disabled:opacity-50"
			>
				<span class="font-roboto text-ribbook-yellow text-sm font-semibold">Opslaan</span>
			</button>
		</form>

		{#if showAlert}
			<div class="w-full rounded-md px-1.5 py-2 text-white {alertVariant}">
				{alertMessage}
			</div>
		{/if}
	</div>

	<!-- tweede sectie, logout + info -->
	<div
		class="outline-ribbook-yellow! flex w-full max-w-2xl flex-col items-center justify-center gap-4! rounded-lg! bg-white px-6! py-4! outline-3"
	>
		<button
			onclick={handleLogout}
			class="bg-ribbook-red! flex h-10! cursor-pointer! items-center! justify-center! gap-3! rounded-lg! px-4!"
		>
			<span class="font-roboto text-ribbook-yellow text-sm font-semibold">Uitloggen</span>
		</button>

		<div class="flex flex-col gap-2 text-sm">
			<p class="w-full">
				Jouw rol: <span class="font-semibold">{$userStore.userProfile?.role || 'onbekend'}</span>
			</p>
			<p class="w-full">
				Jouw email: <span class="font-semibold">{$userStore.currentUser?.email || ''}</span>
			</p>
			<p class="text-text-muted text-xs">
				Vraag een admin (bestuur of techsub) om deze dingen aan te passen of om je account te
				verwijderen
			</p>
		</div>
	</div>
</section>
