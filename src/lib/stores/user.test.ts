import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAdminDeleteUser = vi.fn();
const mockAdminUpdateUser = vi.fn();
const mockListAllUsers = vi.fn();
const mockLoadUserProfile = vi.fn();
const mockLogout = vi.fn();
const mockRegisterUser = vi.fn();
const mockSigninUser = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockUseAuthListener = vi.fn();

vi.mock('$lib/firebase/client/auth.client', () => ({
	adminDeleteUser: mockAdminDeleteUser,
	adminUpdateUser: mockAdminUpdateUser,
	listAllUsers: mockListAllUsers,
	loadUserProfile: mockLoadUserProfile,
	logout: mockLogout,
	registerUser: mockRegisterUser,
	signinUser: mockSigninUser,
	updateUserProfile: mockUpdateUserProfile,
	useAuthListener: mockUseAuthListener
}));

describe('userStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('authenticate sets session state and profile', async () => {
		const fakeUser = { uid: 'user-1', displayName: 'Billie' };
		const fakeProfile = { displayName: 'Billie', role: 'kameraad', email: 'a@b.c', name: 'Billie' };

		mockSigninUser.mockResolvedValue(fakeUser);
		mockLoadUserProfile.mockResolvedValue(fakeProfile);

		const { userStore } = await import('./user');
		await userStore.authenticate({ email: 'a@b.c', password: 'secret' });

		const state = get(userStore);
		expect(state.userLoggedIn).toBe(true);
		expect(state.currentUser).toEqual(fakeUser);
		expect(state.userProfile).toEqual(fakeProfile);
	});

	it('updateProfile updates stored profile when user is logged in', async () => {
		const fakeUser = { uid: 'user-2', displayName: 'Old Name' };
		const originalProfile = {
			displayName: 'Old Name',
			role: 'kameraad',
			email: 'old@site.nl',
			name: 'Old Name'
		};
		const updatedProfile = {
			displayName: 'New Name',
			role: 'kameraad',
			email: 'old@site.nl',
			name: 'Old Name'
		};

		mockSigninUser.mockResolvedValue(fakeUser);
		mockLoadUserProfile.mockResolvedValue(originalProfile);
		mockUpdateUserProfile.mockResolvedValue(updatedProfile);

		const { userStore } = await import('./user');
		await userStore.authenticate({ email: 'old@site.nl', password: 'secret' });
		await userStore.updateProfile({ displayName: 'New Name' });

		const state = get(userStore);
		expect(mockUpdateUserProfile).toHaveBeenCalledWith({ displayName: 'New Name' }, fakeUser);
		expect(state.userProfile).toEqual(updatedProfile);
	});

	it('logout clears authenticated state', async () => {
		const fakeUser = { uid: 'user-3' };
		const fakeProfile = { displayName: 'U', role: 'kameraad', email: 'u@x.y', name: 'U' };

		mockSigninUser.mockResolvedValue(fakeUser);
		mockLoadUserProfile.mockResolvedValue(fakeProfile);
		mockLogout.mockResolvedValue(undefined);

		const { userStore } = await import('./user');
		await userStore.authenticate({ email: 'u@x.y', password: 'secret' });
		await userStore.logout();

		const state = get(userStore);
		expect(mockLogout).toHaveBeenCalledTimes(1);
		expect(state).toEqual({
			authReady: true,
			userLoggedIn: false,
			currentUser: null,
			userProfile: null
		});
	});

	it('initAuth hydrates state from auth listener', async () => {
		const fakeUser = { uid: 'user-4', displayName: 'Auth User' };
		const fakeProfile = {
			displayName: 'Auth User',
			role: 'kameraad',
			email: 'auth@x.y',
			name: 'Auth User'
		};

		mockLoadUserProfile.mockResolvedValue(fakeProfile);
		mockUseAuthListener.mockImplementation(async (callback: (user: unknown) => void) => {
			await callback(fakeUser);
			return () => {};
		});

		const { userStore } = await import('./user');
		await userStore.initAuth();

		const state = get(userStore);
		expect(state.authReady).toBe(true);
		expect(state.userLoggedIn).toBe(true);
		expect(state.currentUser).toEqual(fakeUser);
		expect(state.userProfile).toEqual(fakeProfile);
	});
});
