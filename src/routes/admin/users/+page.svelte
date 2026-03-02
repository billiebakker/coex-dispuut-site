<script lang="ts">
	import { goto } from '$app/navigation';
	import { userStore, type AdminUserProfile } from '$lib/stores/user';
	import type { UserProfile } from '$lib/firebase/client/auth.client';

	let loading = $state(true);
	let saving = $state(false);
	let deletingId = $state<string | null>(null);
	let message = $state('');
	let errorMessage = $state('');

	let users = $state<AdminUserProfile[]>([]);
	let editingId = $state<string | null>(null);
	type SortableColumn = 'name' | 'displayName' | 'email' | 'role' | 'allergies';
	let sortColumn = $state<SortableColumn>('displayName');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const sortedUsers = $derived.by(() => {
		const sorted = [...users].sort((a, b) => {
			const aValue = (a[sortColumn] || '').toString().toLowerCase();
			const bValue = (b[sortColumn] || '').toString().toLowerCase();

			if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		return sorted;
	});

	function toggleSort(column: SortableColumn) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
			return;
		}

		sortColumn = column;
		sortDirection = 'asc';
	}

	function sortIndicator(column: SortableColumn) {
		if (sortColumn !== column) return '↕';
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	let editValues = $state<Partial<UserProfile>>({
		name: '',
		displayName: '',
		email: '',
		role: '',
		allergies: '',
		photoURL: ''
	});

	const isAdmin = $derived($userStore.userProfile?.role === 'admin');

	$effect(() => {
		if (!$userStore.authReady) return;
		if (!isAdmin) {
			goto('/home');
		}
	});

	async function loadUsers() {
		loading = true;
		errorMessage = '';

		try {
			users = await userStore.listUsers();
		} catch (error) {
			console.error(error);
			errorMessage = 'Kon gebruikers niet laden.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!isAdmin) return;
		if (users.length > 0) return;
		void loadUsers();
	});

	function startEdit(user: AdminUserProfile) {
		message = '';
		errorMessage = '';
		editingId = user.uid;
		editValues = {
			name: user.name || '',
			displayName: user.displayName || '',
			email: user.email || '',
			role: user.role || 'kameraad',
			allergies: user.allergies || '',
			photoURL: user.photoURL || ''
		};
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveUser(userId: string) {
		saving = true;
		message = '';
		errorMessage = '';

		try {
			const updates: Partial<UserProfile> = {
				name: (editValues.name || '').trim(),
				displayName: (editValues.displayName || '').trim(),
				email: (editValues.email || '').trim(),
				role: (editValues.role || 'kameraad').trim(),
				allergies: (editValues.allergies || '').trim(),
				photoURL: (editValues.photoURL || '').trim()
			};

			await userStore.adminUpdateUserProfile(userId, updates);
			message = 'Gebruiker opgeslagen.';
			editingId = null;
			await loadUsers();
		} catch (error) {
			console.error(error);
			errorMessage = 'Opslaan mislukt. Probeer opnieuw.';
		} finally {
			saving = false;
		}
	}

	async function deleteUser(user: AdminUserProfile) {
		if ($userStore.currentUser?.uid === user.uid) {
			errorMessage = 'Je kunt je eigen account hier niet verwijderen.';
			return;
		}

		const confirmed = window.confirm(
			`Weet je zeker dat je ${user.displayName || user.name} wilt verwijderen?`
		);
		if (!confirmed) return;

		deletingId = user.uid;
		message = '';
		errorMessage = '';

		try {
			await userStore.adminDeleteUserProfile(user.uid);
			users = users.filter((candidate) => candidate.uid !== user.uid);
			message = 'Gebruiker verwijderd uit profieldata.';
		} catch (error) {
			console.error(error);
			errorMessage = 'Verwijderen mislukt. Probeer opnieuw.';
		} finally {
			deletingId = null;
		}
	}
</script>

<section class="flex w-full flex-1 flex-col items-center gap-4 overflow-auto px-2.5! py-3!">
	<div class="outline-ribbook-yellow w-full max-w-6xl rounded-lg bg-white p-4 outline-3">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<h1 class="font-roboto text-xl font-semibold text-black">Gebruikersbeheer</h1>
			<button
				onclick={loadUsers}
				disabled={loading || saving}
				class="bg-ribbook-red text-ribbook-yellow rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
			>
				Refresh
			</button>
		</div>

		{#if message}
			<p class="mb-3 rounded-md bg-green-500 px-3 py-2 text-sm text-white">{message}</p>
		{/if}
		{#if errorMessage}
			<p class="mb-3 rounded-md bg-red-500 px-3 py-2 text-sm text-white">{errorMessage}</p>
		{/if}

		{#if loading}
			<p class="text-text-muted py-4 text-sm">Gebruikers laden...</p>
		{:else if users.length === 0}
			<p class="text-text-muted py-4 text-sm">Geen gebruikers gevonden.</p>
		{:else}
			<div class="w-full overflow-x-auto">
				<table class="w-full min-w-245 border-collapse text-left text-sm">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="px-2 py-2 font-semibold">
								<button onclick={() => toggleSort('name')} class="flex items-center gap-1">
									<span>Naam</span>
									<span>{sortIndicator('name')}</span>
								</button>
							</th>
							<th class="px-2 py-2 font-semibold">
								<button onclick={() => toggleSort('displayName')} class="flex items-center gap-1">
									<span>Displaynaam</span>
									<span>{sortIndicator('displayName')}</span>
								</button>
							</th>
							<th class="px-2 py-2 font-semibold">
								<button onclick={() => toggleSort('email')} class="flex items-center gap-1">
									<span>E-mail</span>
									<span>{sortIndicator('email')}</span>
								</button>
							</th>
							<th class="px-2 py-2 font-semibold">
								<button onclick={() => toggleSort('role')} class="flex items-center gap-1">
									<span>Rol</span>
									<span>{sortIndicator('role')}</span>
								</button>
							</th>
							<th class="px-2 py-2 font-semibold">
								<button onclick={() => toggleSort('allergies')} class="flex items-center gap-1">
									<span>Allergieën</span>
									<span>{sortIndicator('allergies')}</span>
								</button>
							</th>
							<th class="px-2 py-2 font-semibold">Foto URL</th>
							<th class="px-2 py-2 font-semibold">Acties</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedUsers as user (user.uid)}
							<tr class="border-b border-gray-100 align-top">
								{#if editingId === user.uid}
									<td class="px-2 py-2">
										<input
											bind:value={editValues.name}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<input
											bind:value={editValues.displayName}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<input
											bind:value={editValues.email}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<input
											bind:value={editValues.role}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<input
											bind:value={editValues.allergies}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<input
											bind:value={editValues.photoURL}
											class="bg-bg-light w-full rounded-md px-2 py-1"
										/>
									</td>
									<td class="px-2 py-2">
										<div class="flex items-center gap-2">
											<button
												onclick={() => saveUser(user.uid)}
												disabled={saving}
												class="bg-ribbook-red text-ribbook-yellow rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50"
											>
												Opslaan
											</button>
											<button
												onclick={cancelEdit}
												class="rounded-md bg-gray-200 px-2 py-1 text-xs font-semibold text-black"
											>
												Annuleren
											</button>
										</div>
									</td>
								{:else}
									<td class="px-2 py-2">{user.name || '-'}</td>
									<td class="px-2 py-2">{user.displayName || '-'}</td>
									<td class="px-2 py-2">{user.email || '-'}</td>
									<td class="px-2 py-2">{user.role || '-'}</td>
									<td class="px-2 py-2">{user.allergies || '-'}</td>
									<td class="max-w-52 truncate px-2 py-2">{user.photoURL || '-'}</td>
									<td class="px-2 py-2">
										<div class="flex items-center gap-2">
											<button
												onclick={() => startEdit(user)}
												class="bg-ribbook-red text-ribbook-yellow rounded-md px-2 py-1 text-xs font-semibold"
											>
												Bewerk
											</button>
											<button
												onclick={() => deleteUser(user)}
												disabled={deletingId === user.uid}
												class="bg-ribbook-red rounded-md px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
											>
												Verwijder
											</button>
										</div>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
