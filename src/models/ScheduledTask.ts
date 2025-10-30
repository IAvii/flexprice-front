import { BaseModel } from './base';

export type ScheduledEntityType = 'events' | 'invoice';

export type ScheduledTaskInterval = 'hourly' | 'daily';

export interface ScheduledTask extends BaseModel {
	readonly connection_id: string;
	readonly entity_type: ScheduledEntityType;
	readonly interval: ScheduledTaskInterval;
	readonly enabled: boolean;
	readonly job_config: ScheduledTaskJobConfig;
	readonly last_run_at?: string;
	readonly next_run_at?: string;
	readonly last_run_status?: string;
}

export interface ScheduledTaskJobConfig {
	bucket: string;
	region: string;
	key_prefix: string;
	compression?: string;
	encryption?: string;
	max_file_size_mb?: number;
}
