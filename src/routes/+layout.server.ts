import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
  // url pathname naar client sturen voor route checks enzo
	return {
		pathname: url.pathname
	};
};
