import axiosClient from './config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

type DataObject = Record<string, any>;

const sanitizeData = <T extends DataObject>(data?: T): Partial<T> | undefined => {
	if (!data) return undefined;

	return Object.entries(data).reduce<Partial<T>>((acc, [key, value]) => {
		if (value !== null && value !== undefined && value !== '') {
			acc[key as keyof T] = value;
		}
		return acc;
	}, {} as Partial<T>);
};

export class AxiosClient {
	public static async get<T>(url: string): Promise<T> {
		const response: AxiosResponse<T> = await axiosClient.get(url);
		return response as T;
	}

	// T is the expected response type, D is the type of the data being sent
	public static async post<T, D extends DataObject = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
		const sanitizedData = sanitizeData(data);
		const response: AxiosResponse<T> = await axiosClient.post(url, sanitizedData, config);
		return response as T;
	}

	public static async patch<T, D extends DataObject = any>(url: string, data?: D): Promise<T> {
		const sanitizedData = sanitizeData(data);
		const response: AxiosResponse<T> = await axiosClient.patch(url, sanitizedData);
		return response as T;
	}

	public static async put<T, D extends DataObject = any>(url: string, data?: D): Promise<T> {
		const sanitizedData = sanitizeData(data);
		const response: AxiosResponse<T> = await axiosClient.put(url, sanitizedData);
		return response as T;
	}

	public static async delete<T, D extends DataObject = any>(url: string, data?: D): Promise<T> {
		const sanitizedData = sanitizeData(data);
		const response: AxiosResponse<T> = await axiosClient.delete(url, { data: sanitizedData });
		return response as T;
	}
}
