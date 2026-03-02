<script>
	import { page } from '$app/state';

	const topRoutes = ['/home', '/activiteiten', '/account', '/admin/users'];

	const showBackButton = $derived(!topRoutes.includes(page.url.pathname));

	function handleBack() {
		history.back();
	}

	let currentTitle = $derived.by(() => {
		if (page.url.pathname === '/home') return 'Home';
		if (page.url.pathname.startsWith('/activiteiten')) return 'Activiteiten';
		if (page.url.pathname === '/account') return 'Account';
		if (page.url.pathname.startsWith('/admin/users')) return 'Gebruikers';
		return 'Ribbook';
	});
</script>

<header class="bg-ribbook-red relative flex h-16 w-full shrink-0 items-center justify-center">
	<div class="text-ribbook-yellow font-red-october text-[30px]">{currentTitle}</div>
	{#if showBackButton}
		<button
			type="button"
			onclick={handleBack}
			class="absolute top-0 left-3.5 flex h-full cursor-pointer items-center justify-center"
			aria-label="Ga terug"
		>
			<span class="icon icon-40 icon-yellow">Arrow_Back</span>
		</button>
	{/if}
</header>
