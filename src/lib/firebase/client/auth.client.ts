/* eslint-disable svelte/no-navigation-without-resolve */
import { AUTH, DB } from '$lib/firebase/client/config.client';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	updateProfile,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';

import { goto } from '$app/navigation';

export interface RegisterValues {
	email: string;
	password: string;
	name: string;
}

export interface LoginValues {
	email: string;
	password: string;
}

export interface UserProfile {
	name: string;
	displayName: string;
	role: string;
	email: string;
	photoURL?: string;
	allergies?: string;
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
	const snap = await getDoc(doc(DB, 'users', uid));
	return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function registerUser(values: RegisterValues) {
	const cred = await createUserWithEmailAndPassword(AUTH, values.email, values.password);
	const uid = cred.user.uid;

	const userDoc = doc(DB, 'users', uid);

	await setDoc(userDoc, {
		name: values.name,
		displayName: values.name,
		role: 'kameraad',
		email: values.email
	});

	await updateProfile(cred.user, {
		displayName: values.name
	});

	await goto('/');
	return cred.user;
}

export async function signinUser(values: LoginValues) {
	const cred = await signInWithEmailAndPassword(AUTH, values.email, values.password);
	return cred.user;
}

export async function updateUserProfile(updates: Partial<UserProfile>, user: User) {
	await updateProfile(user, {
		...(updates.displayName && { displayName: updates.displayName }),
		...(updates.photoURL && { photoURL: updates.photoURL })
	});

	const userDoc = doc(DB, 'users', user.uid);
	await updateDoc(userDoc, updates);

	return await loadUserProfile(user.uid);
}

export async function logout() {
	await signOut(AUTH);
}

export function useAuthListener(callback: (user: User | null) => void) {
	return onAuthStateChanged(AUTH, callback);
}

export const postCollection = collection(DB, 'posts');
