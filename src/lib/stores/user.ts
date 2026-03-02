import { writable, type Writable } from 'svelte/store';
import {
	loadUserProfile,
	registerUser,
	signinUser,
	updateUserProfile as fbUpdateUserProfile,
	listAllUsers,
	adminUpdateUser,
	adminDeleteUser,
	logout as fbLogout,
	useAuthListener
} from '$lib/firebase/client/auth.client';
import type { User } from 'firebase/auth';
import type { AdminUserProfile, UserProfile } from '$lib/firebase/client/auth.client';

interface UserState {
	authReady: boolean;
	userLoggedIn: boolean;
	currentUser: User | null;
	userProfile: UserProfile | null;
}

function createUserStore() {
	const store: Writable<UserState> = writable({
		authReady: false,
		userLoggedIn: false,
		currentUser: null,
		userProfile: null
	});

	async function loadProfile(uid: string) {
		const profile = await loadUserProfile(uid);
		store.update((s) => ({ ...s, userProfile: profile }));
	}

	return {
		subscribe: store.subscribe,

		async register(values: { email: string; password: string; name: string }) {
			const user = await registerUser(values);
			store.update((s) => ({ ...s, userLoggedIn: true, currentUser: user }));
			await loadProfile(user.uid);
		},

		async authenticate(values: { email: string; password: string }) {
			const user = await signinUser(values);
			store.update((s) => ({ ...s, userLoggedIn: true, currentUser: user }));
			await loadProfile(user.uid);
		},

		async updateProfile(updates: Partial<UserProfile>) {
			let updatedUser: User | null = null;
			store.update((s) => {
				updatedUser = s.currentUser;
				return s;
			});

			if (!updatedUser) return;

			const newProfile = await fbUpdateUserProfile(updates, updatedUser);
			store.update((s) => ({ ...s, userProfile: newProfile }));
		},

		async listUsers() {
			return await listAllUsers();
		},

		async adminUpdateUserProfile(userId: string, updates: Partial<UserProfile>) {
			return await adminUpdateUser(userId, updates);
		},

		async adminDeleteUserProfile(userId: string) {
			await adminDeleteUser(userId);
		},

		async logout() {
			await fbLogout();
			store.set({
				authReady: true,
				userLoggedIn: false,
				currentUser: null,
				userProfile: null
			});
		},

		initAuth() {
			return new Promise<void>((resolve) => {
				useAuthListener(async (user) => {
					if (user) {
						store.update((s) => ({
							...s,
							currentUser: user,
							userLoggedIn: true,
							authReady: true
						}));
						await loadProfile(user.uid);
					} else {
						store.set({
							authReady: true,
							userLoggedIn: false,
							currentUser: null,
							userProfile: null
						});
					}
					resolve();
				});
			});
		}
	};
}

export const userStore = createUserStore();
export type { AdminUserProfile };
