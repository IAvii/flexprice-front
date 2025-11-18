import { ENTITY_STATUS } from '@/models';

const formatChips = (data: string): string => {
	switch (data) {
		case ENTITY_STATUS.PUBLISHED:
			return 'Active';
		case ENTITY_STATUS.ARCHIVED:
			return 'Inactive';
		case ENTITY_STATUS.DELETED:
			return 'Inactive';
		default:
			return 'Inactive';
	}
};

export default formatChips;
