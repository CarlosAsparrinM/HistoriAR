import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

/**
 * Fetch all historical data entries for a monument
 */
export function useHistoricalData(monumentId) {
  return useQuery({
    queryKey: ['historicalData', monumentId],
    queryFn: () => apiService.getHistoricalDataByMonument(monumentId),
    enabled: !!monumentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single historical data entry
 */
export function useHistoricalDataById(entryId) {
  return useQuery({
    queryKey: ['historicalData', entryId],
    queryFn: () => apiService.getHistoricalDataById(entryId),
    enabled: !!entryId,
  });
}

/**
 * Create a new historical data entry
 * Returns mutation function and mutation state
 */
export function useCreateHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, formData, imageFile }) =>
      apiService.createHistoricalData(monumentId, formData, imageFile),
    onSuccess: (newEntry, variables) => {
      const { monumentId } = variables;

      // Invalidate the list query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ['historicalData', monumentId],
      });

      // Optionally: add the new entry to the cache directly (for instant UI update)
      queryClient.setQueryData(
        ['historicalData', monumentId],
        (oldData) => {
          if (!oldData) return [newEntry];
          return [newEntry, ...oldData];
        }
      );
    },
    onError: (error) => {
      console.error('Error creating historical data:', error);
    },
  });
}

/**
 * Update an existing historical data entry
 */
export function useUpdateHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, formData, imageFile }) =>
      apiService.updateHistoricalData(entryId, formData, imageFile),
    onSuccess: (updatedEntry, variables) => {
      const { entryId } = variables;

      // Update the single entry query
      queryClient.setQueryData(
        ['historicalData', entryId],
        updatedEntry
      );

      // Invalidate the list query (will refetch in background)
      // Get monumentId from the updated entry
      const monumentId = updatedEntry.monumentId;
      queryClient.setQueryData(
        ['historicalData', monumentId],
        (oldData) => {
          if (!oldData) return [updatedEntry];
          return oldData.map((entry) =>
            entry._id === updatedEntry._id ? updatedEntry : entry
          );
        }
      );
    },
    onError: (error) => {
      console.error('Error updating historical data:', error);
    },
  });
}

/**
 * Delete a historical data entry
 */
export function useDeleteHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId) => apiService.deleteHistoricalData(entryId),
    onSuccess: (_, entryId) => {
      // Invalidate all historical data queries to force refetch
      queryClient.invalidateQueries({
        queryKey: ['historicalData'],
      });
    },
    onError: (error) => {
      console.error('Error deleting historical data:', error);
    },
  });
}

/**
 * Reorder historical data entries
 */
export function useReorderHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, items }) =>
      apiService.reorderHistoricalData(monumentId, items),
    onSuccess: (_, variables) => {
      const { monumentId, items } = variables;

      // Update the cached list with new order
      queryClient.setQueryData(
        ['historicalData', monumentId],
        (oldData) => {
          if (!oldData) return oldData;
          // Sort the entries based on the new order
          const orderMap = Object.fromEntries(
            items.map((item) => [item.id, item.order])
          );
          return [...oldData].sort(
            (a, b) => (orderMap[a._id] ?? 0) - (orderMap[b._id] ?? 0)
          );
        }
      );
    },
    onError: (error) => {
      console.error('Error reordering historical data:', error);
    },
  });
}
