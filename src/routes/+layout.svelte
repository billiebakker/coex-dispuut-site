<script>
	import BottomNav from '$lib/components/Navigation/BottomNav.svelte';
	import TopHeaderBar from '$lib/components/Navigation/TopHeaderBar.svelte';
	import { userStore } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { AUTH } from '$lib/firebase/client/config.client';
	import '../index.css';

	let { children, data } = $props();

	// const protectedRoutes = ['/home', '/post', '/activiteiten', '/account', '/'];
	const publicRoutes = ['/login'];

	onMount(() => {
		userStore.initAuth();
	});

	$effect(() => {
		// auth ready?
		if (!$userStore.authReady) return;

		const currentPath = page.url.pathname;
		const firebaseUser = AUTH.currentUser;

		if (!firebaseUser && !publicRoutes.includes(currentPath)) {
			goto('/login');
			return;
		}

		if ($userStore.userLoggedIn && !firebaseUser) {
			goto('/login');
			return;
		}

		if ($userStore.userLoggedIn && (publicRoutes.includes(currentPath) || currentPath === '/')) {
			goto('/home');
		}

		if (!$userStore.userLoggedIn && !publicRoutes.includes(currentPath)) {
			goto('/login');
		}
	});
</script>

<main class="bg-ribbook-red flex h-screen flex-col overflow-hidden">
	{#if $userStore.userLoggedIn}
		<TopHeaderBar />
	{/if}

	<div class="flex-1 overflow-y-auto overscroll-auto">{@render children()}</div>

	{#if $userStore.userLoggedIn}
		<BottomNav />
	{/if}
</main>
