<script lang="ts">
	import { page } from '$app/stores';
	import { userStore } from '$lib/stores/user';

	const isHomeRoute = $derived($page.url.pathname === '/home');
	const isEventsRoute = $derived($page.url.pathname.startsWith('/activiteiten'));
	const isAccountRoute = $derived($page.url.pathname === '/account');
	const isAdminUsersRoute = $derived($page.url.pathname.startsWith('/admin/users'));
	const isAdmin = $derived($userStore.userProfile?.role === 'admin');
</script>

<div
	class="bg-ribbook-rood border-ribbook-pink/20 flex h-16 w-full items-center justify-center border-t"
>
	<nav class="flex w-full max-w-4xl shrink-0 items-center justify-between">
		<!-- HOME -->
		<a href="/home" class="flex h-full flex-1 flex-col items-center justify-center gap-4">
			<div
				class="flex h-13 w-28 items-center justify-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{isHomeRoute ? 'bg-white/20' : ''}
				{isHomeRoute ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Home</span>
			</div>
		</a>

		<!-- activiteiten -->
		<a href="/activiteiten" class="flex h-full flex-1 flex-col items-center justify-center gap-4">
			<div
				class="flex h-13 w-28 items-center justify-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{isEventsRoute ? 'bg-white/20' : ''}
				{isEventsRoute ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Event</span>
			</div>
		</a>

		<!-- ACCOUNT -->
		<a href="/account" class="flex h-full flex-1 flex-col items-center justify-center gap-4">
			<div
				class="flex h-13 w-28 items-center justify-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{isAccountRoute ? 'bg-white/20' : ''}
				{isAccountRoute ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Person</span>
			</div>
		</a>

		{#if isAdmin}
			<a href="/admin/users" class="flex h-full flex-1 flex-col items-center justify-center gap-4">
				<div
					class="flex h-13 w-28 items-center justify-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
					{isAdminUsersRoute ? 'bg-white/20' : ''}
					{isAdminUsersRoute ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
				>
					<span class="icon icon-40 icon-yellow icon-filled">Settings</span>
				</div>
			</a>
		{/if}
	</nav>
</div>
