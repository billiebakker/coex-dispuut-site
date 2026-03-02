<script lang="ts">
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import { userStore } from '$lib/stores/user';
	import ProfilePicture from '../common/ProfilePicture.svelte';
	import { addDoc } from 'firebase/firestore';
	import { postCollection } from '$lib/firebase/client/auth.client';

	const postSchema = yup.object({
		postText: yup
			.string()
			.required('Post tekst is vereist!')
			.min(2, 'Post is te kort, minimaal 2 karakters!')
			.max(400, 'Post is te lang, maximaal 400 karakters!')
	});

	function buildSearchTerms(...values: string[]): string[] {
		const normalized = values
			.map((value) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' '))
			.join(' ');

		return Array.from(new Set(normalized.split(/\s+/).filter((token) => token.length >= 2))).slice(
			0,
			50
		);
	}

	let showAlert = $state(false);
	let alertVariant = $state('bg-blue-800');
	let alertMessage = $state('');
	let submitting = $state(false);

	const { form, errors, reset } = createForm({
		onSubmit: async (values) => {
			await handleSubmit(values as { postText: string });
		},
		extend: validator({ schema: postSchema })
	});

	function autoResize(event: Event) {
		const textarea = event.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		textarea.style.height = textarea.scrollHeight + 'px';
	}

	async function handleSubmit(values: { postText: string }) {
		showAlert = true;
		submitting = true;
		alertVariant = 'bg-ribbook-pink';
		alertMessage = 'Even wachten...';

		try {
			const user = $userStore.currentUser;
			if (!user) throw new Error('Geen gebruiker ingelogd');

			const postText = values.postText.trim();
			const userDisplayName = $userStore.userProfile?.displayName || user.displayName || 'Onbekend';

			const post = {
				postText,
				postTextLower: postText.toLowerCase(),
				searchTerms: buildSearchTerms(postText, userDisplayName),
				datePosted: new Date().toISOString(),
				uid: user.uid,
				userDisplayName,
				userDisplayNameLower: userDisplayName.toLowerCase(),
				userPhotoURL: $userStore.userProfile?.photoURL || null,
				commentCount: 0,
				likeCount: 0,
				dislikeCount: 0,
				liked: false,
				disliked: false
			};

			await addDoc(postCollection, post);

			alertVariant = 'bg-green-500';
			alertMessage = 'Yay gepost!';
			submitting = false;

			reset();

			window.dispatchEvent(new CustomEvent('postCreated'));
		} catch (error) {
			submitting = false;
			alertVariant = 'bg-red-500';
			alertMessage = 'Oei, wat fout gegaan!! Probeer opnieuw.';
			console.error('Post submission error:', error);
		}
	}
</script>

<section
	class="outline-ribbook-yellow flex w-full max-w-120 flex-col items-center gap-2.5 rounded-[13px] bg-white py-1.25 outline-[3px]"
>
	<div class="mt-0.5 flex w-full gap-2.5 px-1.5!">
		<ProfilePicture photoURL={$userStore.userProfile?.photoURL} size="small" />

		<form use:form class="flex flex-1">
			<div class="flex w-full flex-col">
				<textarea
					name="postText"
					placeholder="max 400 tekens...."
					class="bg-bg-light text-text-muted resize-none rounded-xl px-3 py-2 text-base font-normal focus:outline-none!"
					oninput={autoResize}
				></textarea>

				{#if $errors.postText}
					<p class="text-ribbook-red mt-1 block text-sm">{$errors.postText}</p>
				{/if}

				{#if showAlert}
					<div class="mt-1.5 w-full rounded-md px-1.5 py-1 text-white {alertVariant}">
						{alertMessage}
					</div>
				{/if}
			</div>

			<button
				type="submit"
				disabled={submitting}
				class="bg-ribbook-red mt-0 ml-1.5 flex h-10 items-center gap-2 overflow-hidden rounded-[9px] px-2.5 py-0.5 disabled:opacity-50"
			>
				<span class="material-symbols-rounded icon icon-yellow">send</span>
			</button>
		</form>
	</div>
</section>
