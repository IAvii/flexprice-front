import { create } from 'zustand';

export interface ApiDocsSnippet {
	label: string;
	description: string;
	curl: string;
	Python?: string;
	JavaScript?: string;
	PHP?: string;
	Java?: string;
	Go?: string;
	'C#'?: string;
	Ruby?: string;
	Swift?: string;
}

interface ApiDocsState {
	snippets: ApiDocsSnippet[];
	setDocs: (snippets: ApiDocsSnippet[]) => void;
	clearDocs: () => void;
}

export const useApiDocsStore = create<ApiDocsState>((set) => ({
	snippets: [],
	setDocs: (snippets) => set({ snippets }),
	clearDocs: () => set({ snippets: [] }),
}));
