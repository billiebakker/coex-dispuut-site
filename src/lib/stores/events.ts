import { writable, type Writable } from 'svelte/store';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	increment,
	limit,
	orderBy,
	query,
	startAfter,
	updateDoc,
	where,
	deleteField,
	type DocumentSnapshot,
	type QueryConstraint,
	addDoc
} from 'firebase/firestore';
import { DB } from '$lib/firebase/client/config.client';
import { userStore } from './user';
import type { User } from 'firebase/auth';

export type FoodOption = 'no_food' | 'veg' | 'veg_and_meat';
export type FoodChoice = 'no_food_choice' | 'veg_choice' | 'meat_choice' | null;

export interface EventSignUp {
	displayName: string;
	foodChoice: FoodChoice;
	drinkChoice: string | null;
	allergies: string | null;
}

export interface EventItem {
	docID: string;
	title: string;
	date: string;
	description: string;
	signupDeadline: string;
	headerImage: string | null;
	location: string;
	datePosted: string;
	userDisplayName: string;
	uid: string;
	commentCount: number;
	attendeeCount: number;
	foodOption: FoodOption;
	drinkOptions?: string[];
	signUps?: Record<string, EventSignUp>;
}

interface EventsState {
	events: EventItem[];
	lastDoc: DocumentSnapshot | null;
	noMoreEvents: boolean;
	pendingRequest: boolean;
	maxEventsPerPage: number;
	showArchive: boolean;
	sortAscending: boolean;
}

interface EventSignupValues {
	foodChoice?: string;
	drinkChoice?: string;
	allergies?: string;
}

interface NewEventValues {
	title: string;
	date: Date;
	description: string;
	location: string;
	deadlineInHoursToEvent: number;
	foodOption: FoodOption;
	drinkOptions: string[];
	headerImage: string | null;
}

function createEventsStore() {
	const eventsCollection = collection(DB, 'events');
	const store: Writable<EventsState> = writable({
		events: [],
		lastDoc: null,
		noMoreEvents: false,
		pendingRequest: false,
		maxEventsPerPage: 4,
		showArchive: false,
		sortAscending: true
	});

	function getCurrentUser(): User | null {
		let currentUser: User | null = null;
		const unsubscribe = userStore.subscribe((userState) => {
			currentUser = userState.currentUser;
		});
		unsubscribe();
		return currentUser;
	}

	function getState(): EventsState {
		let stateSnapshot: EventsState = {
			events: [],
			lastDoc: null,
			noMoreEvents: false,
			pendingRequest: false,
			maxEventsPerPage: 4,
			showArchive: false,
			sortAscending: true
		};
		const unsubscribe = store.subscribe((state) => {
			stateSnapshot = state;
		});
		unsubscribe();
		return stateSnapshot;
	}

	return {
		subscribe: store.subscribe,

		async userAlreadySignedUp(event: Pick<EventItem, 'docID'>) {
			const user = getCurrentUser();
			if (!user) return false;

			const eventRef = doc(DB, 'events', event.docID);
			const eventSnapshot = await getDoc(eventRef);
			return !!eventSnapshot.data()?.signUps?.[user.uid];
		},

		async removeSignUp(event: Pick<EventItem, 'docID'>) {
			const user = getCurrentUser();
			if (!user) return;

			const eventRef = doc(DB, 'events', event.docID);
			const alreadySignedUp = await this.userAlreadySignedUp(event);
			if (!alreadySignedUp) return;

			await updateDoc(eventRef, {
				[`signUps.${user.uid}`]: deleteField(),
				attendeeCount: increment(-1)
			});

			await this.refreshEvents();
		},

		async signUpOrUpdate(event: Pick<EventItem, 'docID'>, formValues: EventSignupValues) {
			const user = getCurrentUser();
			if (!user) return;

			const signupData: EventSignUp = {
				displayName: user.displayName || 'Onbekend',
				foodChoice: (formValues.foodChoice as FoodChoice) || null,
				drinkChoice: formValues.drinkChoice || null,
				allergies: formValues.allergies || null
			};

			const eventRef = doc(DB, 'events', event.docID);
			const alreadySignedUp = await this.userAlreadySignedUp(event);

			const updatePayload: Record<string, unknown> = {
				[`signUps.${user.uid}`]: signupData
			};

			if (!alreadySignedUp) {
				updatePayload.attendeeCount = increment(1);
			}

			await updateDoc(eventRef, updatePayload);
			await this.refreshEvents();
		},

		async createEvent(values: NewEventValues) {
			const user = getCurrentUser();
			if (!user) throw new Error('Geen gebruiker ingelogd');

			const signupDeadline = new Date(
				values.date.getTime() - values.deadlineInHoursToEvent * 60 * 60 * 1000
			);

			const eventPayload = {
				title: values.title,
				date: values.date.toISOString(),
				description: values.description,
				signupDeadline: signupDeadline.toISOString(),
				headerImage: values.headerImage,
				location: values.location,
				datePosted: new Date().toISOString(),
				userDisplayName: user.displayName || 'Onbekend',
				uid: user.uid,
				commentCount: 0,
				attendeeCount: 0,
				foodOption: values.foodOption,
				drinkOptions: values.drinkOptions
			};

			await addDoc(eventsCollection, eventPayload);
			await this.refreshEvents();
		},

		toggleSort() {
			store.update((state) => ({ ...state, sortAscending: !state.sortAscending }));
			this.refreshEvents();
		},

		async toggleArchive() {
			store.update((state) => ({ ...state, showArchive: !state.showArchive }));
			await this.refreshEvents();
		},

		async fetchEvents() {
			const state = getState();
			if (state.pendingRequest || state.noMoreEvents) return;

			store.update((s) => ({ ...s, pendingRequest: true }));

			const now = new Date();
			const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();
			const currentState = getState();
			const sortDirection = currentState.sortAscending ? 'asc' : 'desc';

			const constraints: QueryConstraint[] = [
				orderBy('date', sortDirection),
				where('date', currentState.showArchive ? '<' : '>=', eightHoursAgo),
				limit(currentState.maxEventsPerPage)
			];

			if (currentState.lastDoc) {
				constraints.splice(1, 0, startAfter(currentState.lastDoc));
			}

			const eventsQuery = query(eventsCollection, ...constraints);
			const snapshot = await getDocs(eventsQuery);

			if (!snapshot.empty) {
				const loadedEvents: EventItem[] = snapshot.docs.map((docSnap) => {
					const data = docSnap.data();
					return {
						docID: docSnap.id,
						title: data.title,
						date: data.date,
						description: data.description,
						signupDeadline: data.signupDeadline,
						headerImage: data.headerImage || null,
						location: data.location || '',
						datePosted: data.datePosted,
						userDisplayName: data.userDisplayName || 'Onbekend',
						uid: data.uid,
						commentCount: data.commentCount || 0,
						attendeeCount: data.attendeeCount || 0,
						foodOption: (data.foodOption || 'no_food') as FoodOption,
						drinkOptions: data.drinkOptions || [],
						signUps: data.signUps || {}
					};
				});

				store.update((s) => {
					const deduped = [...s.events];
					for (const event of loadedEvents) {
						if (!deduped.some((existing) => existing.docID === event.docID)) {
							deduped.push(event);
						}
					}

					return {
						...s,
						events: deduped,
						lastDoc: snapshot.docs[snapshot.docs.length - 1],
						pendingRequest: false
					};
				});
				return;
			}

			store.update((s) => ({ ...s, noMoreEvents: true, pendingRequest: false }));
		},

		async fetchEventById(id: string): Promise<EventItem | null> {
			const state = getState();
			const cached = state.events.find((event) => event.docID === id);
			if (cached) return cached;

			const snap = await getDoc(doc(DB, 'events', id));
			if (!snap.exists()) return null;

			const data = snap.data();
			const event: EventItem = {
				docID: snap.id,
				title: data.title,
				date: data.date,
				description: data.description,
				signupDeadline: data.signupDeadline,
				headerImage: data.headerImage || null,
				location: data.location || '',
				datePosted: data.datePosted,
				userDisplayName: data.userDisplayName || 'Onbekend',
				uid: data.uid,
				commentCount: data.commentCount || 0,
				attendeeCount: data.attendeeCount || 0,
				foodOption: (data.foodOption || 'no_food') as FoodOption,
				drinkOptions: data.drinkOptions || [],
				signUps: data.signUps || {}
			};

			store.update((s) => ({ ...s, events: [...s.events, event] }));
			return event;
		},

		async refreshEvents() {
			await this.resetEvents();
			await this.fetchEvents();
		},

		async resetEvents() {
			store.update((state) => ({
				...state,
				events: [],
				lastDoc: null,
				noMoreEvents: false,
				pendingRequest: false
			}));
		}
	};
}

export const eventsStore = createEventsStore();
