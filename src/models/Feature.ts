import { BaseModel, Metadata } from './base';
import { Meter } from './Meter';

export interface AlertThreshold {
	threshold: string;
	condition: 'above' | 'below';
}

export interface AlertSettings {
	critical?: AlertThreshold;
	warning?: AlertThreshold;
	info?: AlertThreshold;
	alert_enabled?: boolean;
}

export interface Feature extends BaseModel {
	readonly name: string;
	readonly description: string;
	readonly lookup_key?: string;
	readonly meter_id: string;
	readonly metadata: Metadata;
	readonly type: FEATURE_TYPE;
	readonly tenant_id: string;
	readonly unit_plural: string;
	readonly unit_singular: string;
	readonly meter?: Meter;
	readonly alert_settings?: AlertSettings;
}

export enum FEATURE_TYPE {
	METERED = 'metered',
	STATIC = 'static',
	BOOLEAN = 'boolean',
}

export default Feature;
