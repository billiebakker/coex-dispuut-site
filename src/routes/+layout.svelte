<script>
	import BottomNav from '$lib/components/Navigation/BottomNav.svelte';
	import TopHeaderBar from '$lib/components/Navigation/TopHeaderBar.svelte';
	import { userStore } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children, data } = $props();

	onMount(() => {
		userStore.initAuth();
	});

	const protectedRoutes = ['/home', '/post', '/activiteiten', '/account'];
	const publicRoutes = ['/login'];

	$effect(() => {
		// auth ready?
		if (!$userStore.authReady) return;

		const currentPath = page.url.pathname;

		if ($userStore.userLoggedIn && publicRoutes.includes(currentPath)) {
			goto('/home');
		}

		if (!$userStore.userLoggedIn && protectedRoutes.includes(currentPath)) {
			goto('/login');
		}
	});
</script>

<main class="bg-ribbook-red flex min-h-screen flex-col">
	{#if $userStore.userLoggedIn}
		<TopHeaderBar />
	{/if}

	<div class="flex-1">{@render children()}</div>

	{#if $userStore.userLoggedIn}
		<BottomNav />
	{/if}
</main>
