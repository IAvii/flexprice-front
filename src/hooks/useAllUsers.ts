import { useQuery } from '@tanstack/react-query';
import { UserApi } from '@/api';
import { GetServiceAccountsResponse } from '@/types/dto/UserApi';

export const USE_ALL_USERS_QUERY_KEY = ['getAllUsers'] as const;

const useAllUsers = () => {
	const { data, isLoading, isError, error } = useQuery<GetServiceAccountsResponse>({
		queryKey: USE_ALL_USERS_QUERY_KEY,
		queryFn: () => UserApi.getAllUsers(),
	});

	return {
		users: data,
		isLoading,
		isError,
		error,
	};
};

export default useAllUsers;
