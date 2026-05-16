import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

/**
 * Fetch tours with pagination and filters
 */
export function useTours(params = {}) {
  return useQuery({
    queryKey: ['tours', params],
    queryFn: () => apiService.getTours(params),
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
  });
}

/**
 * Fetch a single tour
 */
export function useTourById(tourId) {
  return useQuery({
    queryKey: ['tours', tourId],
    queryFn: () => apiService.getTour(tourId),
    enabled: !!tourId,
  });
}

/**
 * Create a new tour
 */
export function useCreateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createTour(data),
    onSuccess: (newTour) => {
      queryClient.invalidateQueries({
        queryKey: ['tours'],
      });

      queryClient.setQueryData(['tours', { page: 1 }], (oldData) => {
        if (!oldData) return { items: [newTour], total: 1 };
        return {
          items: [newTour, ...(oldData.items || [])],
          total: (oldData.total || 0) + 1,
        };
      });
    },
    onError: (error) => {
      console.error('Error creating tour:', error);
    },
  });
}

/**
 * Update an existing tour
 */
export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tourId, data }) =>
      apiService.updateTour(tourId, data),
    onSuccess: (updatedTour, variables) => {
      const { tourId } = variables;

      queryClient.setQueryData(['tours', tourId], updatedTour);

      queryClient.setQueryData(
        ['tours'],
        (oldData) => {
          if (!oldData || !oldData.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((t) =>
              t._id === updatedTour._id ? updatedTour : t
            ),
          };
        }
      );
    },
    onError: (error) => {
      console.error('Error updating tour:', error);
    },
  });
}

/**
 * Delete a tour
 */
export function useDeleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tourId) => apiService.deleteTour(tourId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tours'],
      });
    },
    onError: (error) => {
      console.error('Error deleting tour:', error);
    },
  });
}
