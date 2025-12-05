<script>
	import BottomNav from '$lib/components/Navigation/BottomNav.svelte';
	import TopHeaderBar from '$lib/components/Navigation/TopHeaderBar.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<main class="flex flex-col min-h-screen bg-ribbook-red">
	<TopHeaderBar />
	{@render children()}
	<BottomNav />
</main>
