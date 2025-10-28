import { BaseModel, Metadata } from './base';
import { Price } from './Price';

export interface CostSheet extends BaseModel {
	readonly name: string;
	readonly description: string;
	readonly lookup_key: string;
	readonly metadata: Metadata;
	readonly prices?: Price[];
}

export default CostSheet;
