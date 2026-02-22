<script lang="ts">
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import { onDestroy, onMount } from 'svelte';
	import { commentsStore } from '$lib/stores/comments';
	import CommentItem from './CommentItem.svelte';
	import ProfilePicture from '../common/ProfilePicture.svelte';
	import { userStore } from '$lib/stores/user';

	interface Props {
		postId: string;
		onCommentCreated?: () => void;
	}

	let { postId, onCommentCreated }: Props = $props();

	const commentSchema = yup.object({
		commentText: yup
			.string()
			.required('Commentaar tekst is vereist!')
			.min(1, 'Niet meer te zeggen??')
			.max(400, 'Teveel commentaar, maximaal 400 karakters!')
	});

	let submitting = $state(false);
	let showAlert = $state(false);
	let alertVariant = $state('bg-blue-800');
	let alertMessage = $state('');

	const { form, errors, reset } = createForm({
		onSubmit: async (values) => {
			await handleSubmit(values as { commentText: string });
		},
		extend: validator({ schema: commentSchema })
	});

	function autoResize(event: Event) {
		const textarea = event.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		textarea.style.height = textarea.scrollHeight + 'px';
	}

	async function handleSubmit(values: { commentText: string }) {
		submitting = true;
		showAlert = true;
		alertVariant = 'bg-ribbook-pink';
		alertMessage = 'Even wachten...';

		try {
			await commentsStore.createComment(postId, values.commentText.trim());
			alertVariant = 'bg-green-500';
			alertMessage = 'Commentaar geplaatst!';
			reset();
			onCommentCreated?.();
		} catch (error) {
			console.error('Comment submission error:', error);
			alertVariant = 'bg-red-500';
			alertMessage = 'Oei, wat fout gegaan!! Probeer opnieuw.';
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
		if (!postId) return;
		await commentsStore.fetchComments(postId);
	});

	onDestroy(() => {
		commentsStore.reset();
	});
</script>

<div class="flex w-full max-w-120 flex-col gap-2.5">
	<section
		class="outline-ribbook-yellow flex w-full flex-col items-center gap-2.5 rounded-[13px] bg-white py-1.25 outline-[3px]"
	>
		<!-- create comment -->
		<div class="mt-0.5 flex w-full gap-2.5 px-1.5!">
			<ProfilePicture photoURL={$userStore.userProfile?.photoURL} size="small" />

			<form use:form class="flex flex-1">
				<div class="flex w-full flex-col">
					<textarea
						name="commentText"
						placeholder="Commentaar geven..."
						class="bg-bg-light text-text-muted resize-none rounded-xl px-3 py-2 text-base font-normal focus:outline-none!"
						oninput={autoResize}
					></textarea>

					{#if $errors.commentText}
						<p class="text-ribbook-red mt-1 block text-sm">{$errors.commentText}</p>
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

	{#if $commentsStore.pendingRequest}
		<div class="text-text-muted text-center">Commentaar laden...</div>
	{:else if $commentsStore.comments.length === 0}
		<div class="text-text-muted text-center">Nog geen commentaar.</div>
	{:else}
		{#each $commentsStore.comments as comment (comment.docID)}
			<CommentItem {comment} />
		{/each}
	{/if}
</div>
