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
	startAt,
	endAt,
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
	filteredEvents: EventItem[];
	searchQuery: string;
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

const SEARCH_RESULTS_LIMIT = 25;
const MAX_SEARCH_TOKENS = 5;
let searchRequestCounter = 0;

function normalizeSearchValue(value: string): string {
	return value.trim().toLowerCase();
}

function tokenizeSearchValue(value: string): string[] {
	const normalized = normalizeSearchValue(value);
	if (!normalized) return [];

	const cleaned = normalized.replace(/[^\p{L}\p{N}\s]/gu, ' ');
	return Array.from(new Set(cleaned.split(/\s+/).filter((token) => token.length >= 2))).slice(
		0,
		MAX_SEARCH_TOKENS
	);
}

function buildSearchTerms(...values: string[]): string[] {
	const normalized = values
		.map((value) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' '))
		.join(' ');

	return Array.from(new Set(normalized.split(/\s+/).filter((token) => token.length >= 2))).slice(
		0,
		80
	);
}

function mapEventDoc(docSnap: DocumentSnapshot): EventItem {
	const data = docSnap.data() as Record<string, unknown>;
	return {
		docID: docSnap.id,
		title: (data.title as string) || '',
		date: (data.date as string) || '',
		description: (data.description as string) || '',
		signupDeadline: (data.signupDeadline as string) || '',
		headerImage: (data.headerImage as string) || null,
		location: (data.location as string) || '',
		datePosted: (data.datePosted as string) || '',
		userDisplayName: (data.userDisplayName as string) || 'Onbekend',
		uid: (data.uid as string) || '',
		commentCount: (data.commentCount as number) || 0,
		attendeeCount: (data.attendeeCount as number) || 0,
		foodOption: ((data.foodOption as FoodOption) || 'no_food') as FoodOption,
		drinkOptions: (data.drinkOptions as string[]) || [],
		signUps: (data.signUps as Record<string, EventSignUp>) || {}
	};
}

function filterEvents(events: EventItem[], searchQuery: string): EventItem[] {
	const query = normalizeSearchValue(searchQuery);
	if (!query) return events;

	return events.filter((event) => {
		const title = event.title.toLowerCase();
		const description = event.description.toLowerCase();
		const location = event.location.toLowerCase();
		return title.includes(query) || description.includes(query) || location.includes(query);
	});
}

function createEventsStore() {
	const eventsCollection = collection(DB, 'events');
	const store: Writable<EventsState> = writable({
		events: [],
		filteredEvents: [],
		searchQuery: '',
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
			filteredEvents: [],
			searchQuery: '',
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
			const title = values.title.trim();
			const description = values.description.trim();
			const location = values.location.trim();
			const userDisplayName = user.displayName || 'Onbekend';

			const eventPayload = {
				title,
				titleLower: title.toLowerCase(),
				date: values.date.toISOString(),
				description,
				descriptionLower: description.toLowerCase(),
				signupDeadline: signupDeadline.toISOString(),
				headerImage: values.headerImage,
				location,
				locationLower: location.toLowerCase(),
				searchTerms: buildSearchTerms(title, description, location, userDisplayName),
				datePosted: new Date().toISOString(),
				userDisplayName,
				userDisplayNameLower: userDisplayName.toLowerCase(),
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
			if (state.pendingRequest || state.noMoreEvents || state.searchQuery.trim()) return;

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
				const loadedEvents: EventItem[] = snapshot.docs.map((docSnap) => mapEventDoc(docSnap));

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
						filteredEvents: filterEvents(deduped, s.searchQuery),
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

			const event = mapEventDoc(snap);

			store.update((s) => {
				const nextEvents = [...s.events, event];
				return {
					...s,
					events: nextEvents,
					filteredEvents: filterEvents(nextEvents, s.searchQuery)
				};
			});
			return event;
		},

		setSearchQuery(searchQuery: string) {
			const activeRequest = ++searchRequestCounter;
			const normalizedQuery = normalizeSearchValue(searchQuery);

			store.update((state) => ({
				...state,
				searchQuery,
				filteredEvents: normalizedQuery ? state.filteredEvents : state.events
			}));

			if (!normalizedQuery) {
				store.update((state) => ({ ...state, pendingRequest: false }));
				return;
			}

			void this.searchEvents(searchQuery, activeRequest);
		},

		async searchEvents(searchQuery: string, requestId: number) {
			const normalizedQuery = normalizeSearchValue(searchQuery);
			const searchTokens = tokenizeSearchValue(searchQuery);

			if (!normalizedQuery) {
				store.update((state) => ({
					...state,
					filteredEvents: state.events,
					pendingRequest: false
				}));
				return;
			}

			store.update((state) => ({ ...state, pendingRequest: true }));

			try {
				const titleQuery = query(
					eventsCollection,
					orderBy('titleLower'),
					startAt(normalizedQuery),
					endAt(`${normalizedQuery}\uf8ff`),
					limit(SEARCH_RESULTS_LIMIT)
				);

				const descriptionQuery = query(
					eventsCollection,
					orderBy('descriptionLower'),
					startAt(normalizedQuery),
					endAt(`${normalizedQuery}\uf8ff`),
					limit(SEARCH_RESULTS_LIMIT)
				);

				const locationQuery = query(
					eventsCollection,
					orderBy('locationLower'),
					startAt(normalizedQuery),
					endAt(`${normalizedQuery}\uf8ff`),
					limit(SEARCH_RESULTS_LIMIT)
				);

				const tokenQueries = searchTokens.map((token) =>
					query(
						eventsCollection,
						where('searchTerms', 'array-contains', token),
						limit(SEARCH_RESULTS_LIMIT)
					)
				);

				const snapshots = await Promise.all([
					getDocs(titleQuery),
					getDocs(descriptionQuery),
					getDocs(locationQuery),
					...tokenQueries.map((tokenQuery) => getDocs(tokenQuery))
				]);

				if (requestId !== searchRequestCounter) return;

				const docsById = new Map<string, EventItem>();
				for (const snapshot of snapshots) {
					for (const docSnap of snapshot.docs) {
						docsById.set(docSnap.id, mapEventDoc(docSnap));
					}
				}

				const searchResults = filterEvents(Array.from(docsById.values()), searchQuery).sort(
					(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
				);

				store.update((state) => ({
					...state,
					filteredEvents: searchResults,
					pendingRequest: false
				}));
			} catch (error) {
				if (requestId !== searchRequestCounter) return;
				console.error('Error searching events:', error);
				store.update((state) => ({
					...state,
					filteredEvents: filterEvents(state.events, searchQuery),
					pendingRequest: false
				}));
			}
		},

		async refreshEvents() {
			const state = getState();
			const searchQuery = state.searchQuery;

			await this.resetEvents();

			if (searchQuery.trim()) {
				const requestId = ++searchRequestCounter;
				store.update((s) => ({ ...s, searchQuery }));
				await this.searchEvents(searchQuery, requestId);
				return;
			}

			await this.fetchEvents();
		},

		async resetEvents() {
			store.update((state) => ({
				...state,
				events: [],
				filteredEvents: [],
				lastDoc: null,
				noMoreEvents: false,
				pendingRequest: false
			}));
		}
	};
}

export const eventsStore = createEventsStore();
