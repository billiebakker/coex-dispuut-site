<script lang="ts">
	import { createForm } from 'felte';
	import { validator } from '@felte/validator-yup';
	import * as yup from 'yup';
	import { goto } from '$app/navigation';
	import { userStore } from '$lib/stores/user';

	let isLogin = $state(true);

	let showAlert = $state(false);
	let alertVariant = $state('bg-blue-800');
	let alertMessage = $state('');
	let submitting = $state(false);

	const loginSchema = yup.object({
		email: yup
			.string()
			.required('E-mailadres is vereist!')
			.email('Ongeldig e-mailadres!')
			.max(100, 'E-mailadres is te lang, maximaal 100 karakters!'),
		password: yup
			.string()
			.required('Wachtwoord is vereist!')
			.min(3, 'Wachtwoord is te kort, minimaal 3 karakters!')
			.max(100, 'Wachtwoord is te lang, maximaal 100 karakters!')
	});

	const registerSchema = yup.object({
		name: yup
			.string()
			.required('Naam is vereist!')
			.min(2, 'Naam is te kort, minimaal 2 karakters!')
			.max(60, 'Naam is te lang, maximaal 60 karakters!')
			.matches(/^[a-zA-Z\s]*$/, 'Naam mag alleen letters en spaties bevatten!'),
		email: yup
			.string()
			.required('E-mailadres is vereist!')
			.email('Ongeldig e-mailadres!')
			.max(100, 'E-mailadres is te lang, maximaal 100 karakters!'),
		password: yup
			.string()
			.required('Wachtwoord is vereist!')
			.min(8, 'Wachtwoord is te kort, minimaal 8 karakters!')
			.max(100, 'Wachtwoord is te lang, maximaal 100 karakters!'),
		confirm_password: yup
			.string()
			.required('Bevestiging wachtwoord is vereist!')
			.oneOf([yup.ref('password')], 'Wachtwoorden komen niet overeen!')
	});

	const schema = $derived(isLogin ? loginSchema : registerSchema);

	// form setup
	const { form, errors, reset } = createForm({
		onSubmit: async (values) => {
			await handleSubmit(values as Record<string, unknown>);
		},
		extend: validator({ schema: loginSchema })
	});

	// submit handelen
	async function handleSubmit(values: Record<string, unknown>) {
		showAlert = true;
		submitting = true;
		alertVariant = 'bg-blue-800';
		alertMessage = isLogin ? 'Je wordt ingelogd...' : 'Je account wordt aangemaakt...';

		try {
			if (isLogin) {
				await userStore.authenticate(values as { email: string; password: string });
			} else {
				await userStore.register(values as { email: string; password: string; name: string });
			}
		} catch (error) {
			submitting = false;
			alertVariant = 'bg-red-500';
			alertMessage = isLogin
				? 'Verkeerde gegevens!!! Probeer nog eens'
				: 'Er is een fout opgetreden :(((';
			console.error(error);
			return;
		}

		alertVariant = 'bg-green-500';
		alertMessage = isLogin ? 'Welkom terug!' : 'Yay gelukt!';

		await new Promise((r) => setTimeout(r, 600));
		goto('/home');
	}

	// login of register
	function toggleForm() {
		isLogin = !isLogin;
		reset();
		showAlert = false;
	}
</script>

<div class="flex h-screen w-screen flex-col items-center justify-center">
	<section
		class="flex w-full grow flex-col items-center gap-7.5 overflow-scroll"
		class:pt-[100px]!={isLogin}
		class:pt-[30px]!={!isLogin}
	>
		<header class="flex flex-col items-center gap-3 text-center">
			<h1 class="text-ribbook-yellow font-red-october text-4xl!">Corduroy</h1>
			<h2 class="text-ribbook-yellow font-red-october text-3xl!">Ribbook</h2>
		</header>

		{#if showAlert}
			<div
				class="outline-ribbook-yellow mb-4 flex h-10.5 w-full max-w-95 items-center justify-center rounded-[5px] px-3.5 py-1.25 font-bold text-white outline-3 {alertVariant}"
			>
				{alertMessage}
			</div>
		{/if}

		<div class="w-full max-w-95 px-3">
			<form use:form class="flex w-full flex-col items-center gap-4">
				<!-- NAAM -->
				{#if !isLogin}
					<div class="w-full">
						<label
							class="outline-main-medium-gray flex h-10.5 w-full items-center rounded-[5px] bg-white px-3.5! py-1.25 outline-2"
						>
							<input
								name="name"
								type="text"
								placeholder="Naam"
								class="text-text-muted w-full bg-transparent pl-2 text-base font-normal focus:outline-none!"
							/>
						</label>
						{#if $errors.name}
							<p class="text-ribbook-yellow mt-1 block text-sm">
								{$errors.name}
							</p>
						{/if}
					</div>
				{/if}

				<!-- EMAIL -->
				<div class="w-full">
					<label
						class="outline-main-medium-gray flex h-10.5 w-full items-center rounded-[5px] bg-white px-3.5! py-1.25 outline-2"
					>
						<input
							name="email"
							type="email"
							placeholder="E-mailadres"
							class="text-text-muted w-full bg-transparent pl-2 text-base font-normal focus:outline-none!"
						/>
					</label>
					{#if $errors.email}
						<p class="text-ribbook-yellow mt-1 block text-sm">
							{$errors.email}
						</p>
					{/if}
				</div>

				<!-- WACHTWOORD -->
				<div class="w-full">
					<label
						class="outline-main-medium-gray flex h-10.5 w-full items-center rounded-[5px] bg-white px-3.5! py-1.25 outline-2"
					>
						<input
							name="password"
							type="password"
							placeholder="Wachtwoord"
							class="text-text-muted w-full bg-transparent pl-2 text-base font-normal focus:outline-none!"
						/>
					</label>
					{#if $errors.password}
						<p class="text-ribbook-yellow mt-1 block text-sm">
							{$errors.password}
						</p>
					{/if}
				</div>

				{#if !isLogin}
					<div class="w-full">
						<label
							class="outline-main-medium-gray flex h-10.5 w-full items-center rounded-[5px] bg-white px-3.5! py-1.25 outline-2"
						>
							<input
								name="confirm_password"
								type="password"
								placeholder="Bevestig wachtwoord"
								class="text-text-muted w-full bg-transparent pl-2 text-base font-normal focus:outline-none!"
							/>
						</label>
						{#if $errors.confirm_password}
							<p class="text-ribbook-yellow mt-1 block text-sm">
								{$errors.confirm_password}
							</p>
						{/if}
					</div>
				{/if}

				<!-- SUBMIT -->
				<div class="my-6 flex w-full flex-col items-center gap-4">
					<button
						class="bg-ribbook-yellow! outline-main-medium-gray flex h-10.5 w-58 items-center justify-center gap-2.5 rounded outline-1 -outline-offset-1 disabled:opacity-50"
						type="submit"
						disabled={submitting}
					>
						<span class="text-dark-gray text-base font-semibold">
							{isLogin ? 'LOGIN' : 'Account aanmaken'}
						</span>
						{#if isLogin}
							<span class="material-symbols-rounded text-dark-gray text-xl">login</span>
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- TOGGLE -->
		<button
			onclick={toggleForm}
			class="outline-ribbook-yellow mb-4 flex h-10.5 w-58 items-center justify-center rounded outline-1 -outline-offset-1"
		>
			<span class="text-ribbook-yellow text-[15px] font-semibold">
				{isLogin ? 'Nog geen account?' : 'Terug naar login'}
			</span>
		</button>
	</section>

	<div class="bg-ribbook-yellow h-13 w-full"></div>
</div>
