<script lang="ts">
	import { page } from '$app/stores';
	const userLoggedIn = true; // TODO : check if user is logged in
</script>

<div
	class="h-16 w-full bg-ribbook-rood justify-center flex items-center border-t border-ribbook-pink/20"
>
	<nav class="shrink-0 w-full flex justify-between items-center max-w-4xl">
		<!-- HOME -->
		<a href="/home" class="flex-1 h-full flex flex-col justify-center items-center gap-4">
			<div
				class="w-28 h-13 flex justify-center items-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{$page.url.pathname === '/home' ? 'bg-white/20' : ''}
				{$page.url.pathname === '/home' ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Home</span>
			</div>
		</a>

		<!-- activiteiten -->
		<a href="/activiteiten" class="flex-1 h-full flex flex-col justify-center items-center gap-4">
			<div
				class="w-28 h-13 flex justify-center items-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{$page.url.pathname === '/activiteiten' ? 'bg-white/20' : ''}
				{$page.url.pathname === '/activiteiten' ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Event</span>
			</div>
		</a>

		<!-- ACCOUNT -->
		<a href="/account" class="flex-1 h-full flex flex-col justify-center items-center gap-4">
			<div
				class="w-28 h-13 flex justify-center items-center gap-2.5 rounded-full transition-all duration-200 ease-in-out
				{$page.url.pathname === '/account' ? 'bg-white/20' : ''}
				{$page.url.pathname === '/account' ? 'hover:bg-white/20' : 'hover:bg-white/30'}"
			>
				<span class="icon icon-40 icon-yellow icon-filled">Person</span>
			</div>
		</a>
	</nav>
</div>
