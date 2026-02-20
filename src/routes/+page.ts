import { userStore } from '$lib/stores/user';

export async function load() {
	// app initialiseren, user check
	await userStore.initAuth();
}
