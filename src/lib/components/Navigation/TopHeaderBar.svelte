<script>
	import { page } from '$app/state';

	let currentTitle = $derived.by(() => {
		switch (page.url.pathname) {
			case '/home':
				return 'Home';
			case '/activiteiten':
				return 'Activiteiten';
			case '/account':
				return 'Account';
			default:
				return 'Ribbook';
		}
	});
</script>

<header class="bg-ribbook-red relative flex h-16 w-full shrink-0 items-center justify-center">
	<div class="text-ribbook-yellow font-red-october text-[30px]">{currentTitle}</div>
	<!-- <a href="" class="absolute top-0 left-3.5 flex h-full cursor-pointer items-center justify-center"> -->
	<!-- v-if="!['home', 'events', 'account'].includes($route.name)"
      @click="$router.back()" -->
	<!-- <span class="icon icon-40 icon-yellow">Arrow_Back</span> -->
	<!-- </a> -->
</header>
