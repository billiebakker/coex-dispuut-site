<script lang="ts">
	import imageCompression from 'browser-image-compression';

	interface Props {
		photoURL?: string | null;
		size?: 'small' | 'large';
		writeable?: boolean | false;
		onUpload?: (file: File) => Promise<void>;
	}

	let { photoURL = null, size = 'large', writeable = false, onUpload }: Props = $props();

	let uploading = $state(false);
	// svelte-ignore non_reactive_update
	let fileInput: HTMLInputElement;

	const sizeClasses = $derived(size === 'small' ? 'h-12 w-12' : 'h-24 w-24');
	const iconSize = $derived(size === 'small' ? 'icon-40' : 'icon-80');

	async function handleImageUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		if (!file.type.startsWith('image/')) {
			alert('Alleen afbeeldingen zijn toegestaan!');
			return;
		}

		try {
			uploading = true;

			const compressedFile = await imageCompression(file, {
				maxSizeMB: 0.1,
				maxWidthOrHeight: 200,
				useWebWorker: true
			});

			if (onUpload) {
				await onUpload(compressedFile);
			}
		} catch (error) {
			console.error('Image compression failed:', error);
			alert('Er ging iets fout bij het comprimeren van de afbeelding!');
		} finally {
			uploading = false;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="bg-ribbook-pink flex items-center justify-center overflow-hidden rounded-full {sizeClasses}"
	class:cursor-pointer={writeable}
	class:transition-opacity={writeable}
	class:hover:opacity-70={writeable}
	onclick={() => writeable && fileInput?.click()}
>
	{#if photoURL}
		<img src={photoURL} alt="Profile" class="h-full w-full object-cover" />
	{:else}
		<span class="material-symbols-rounded icon {iconSize} text-icon-fill">person</span>
	{/if}
</div>

{#if writeable}
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={handleImageUpload}
		disabled={uploading}
	/>
{/if}
