import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

/**
 * Fetch monuments with pagination and filters
 */
export function useMonuments(params = {}) {
  return useQuery({
    queryKey: ['monuments', params],
    queryFn: () => apiService.getMonuments(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true, // Smooth pagination transition
  });
}

/**
 * Fetch a single monument
 */
export function useMonumentById(monumentId) {
  return useQuery({
    queryKey: ['monuments', monumentId],
    queryFn: () => apiService.getMonument(monumentId),
    enabled: !!monumentId,
  });
}

/**
 * Create a new monument
 */
export function useCreateMonument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createMonument(data),
    onSuccess: (newMonument) => {
      // Invalidate monuments list to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['monuments'],
      });

      // Invalidate AR experiences lists so AR view sees new monuments
      queryClient.invalidateQueries({
        queryKey: ['arExperiences'],
      });

      // Optionally: add to cache (insert at beginning for page 1)
      queryClient.setQueryData(['monuments', { page: 1 }], (oldData) => {
        if (!oldData) return { items: [newMonument], total: 1 };
        return {
          items: [newMonument, ...(oldData.items || [])],
          total: (oldData.total || 0) + 1,
        };
      });
    },
    onError: (error) => {
      console.error('Error creating monument:', error);
    },
  });
}

/**
 * Update an existing monument
 */
export function useUpdateMonument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, data }) =>
      apiService.updateMonument(monumentId, data),
    onSuccess: (updatedMonument, variables) => {
      const { monumentId } = variables;

      // Update the single monument cache
      queryClient.setQueryData(['monuments', monumentId], updatedMonument);

      // Update in the list cache
      queryClient.setQueryData(
        ['monuments'],
        (oldData) => {
          if (!oldData || !oldData.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((m) =>
              m._id === updatedMonument._id ? updatedMonument : m
            ),
          };
        }
      );

      // Also invalidate AR experiences in case availability/labels changed
      queryClient.invalidateQueries({ queryKey: ['arExperiences'] });
    },
    onError: (error) => {
      console.error('Error updating monument:', error);
    },
  });
}

/**
 * Delete a monument
 */
export function useDeleteMonument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monumentId) => apiService.deleteMonument(monumentId),
    onSuccess: () => {
      // Invalidate all monument queries
      queryClient.invalidateQueries({
        queryKey: ['monuments'],
      });
      // Invalidate AR experiences
      queryClient.invalidateQueries({ queryKey: ['arExperiences'] });
    },
    onError: (error) => {
      console.error('Error deleting monument:', error);
    },
  });
}

/**
 * Upload a model version for a monument
 */
export function useUploadModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, file }) =>
      apiService.uploadModelVersion(monumentId, file),
    onSuccess: (result, variables) => {
      const { monumentId } = variables;

      // Invalidate model versions query for this monument
      queryClient.invalidateQueries({
        queryKey: ['modelVersions', monumentId],
      });

      // Invalidate monument cache to reflect new model
      queryClient.invalidateQueries({
        queryKey: ['monuments', monumentId],
      });

      // Invalidate AR experiences so the list updates (monument now has model)
      queryClient.invalidateQueries({ queryKey: ['arExperiences', monumentId] });
    },
    onError: (error) => {
      console.error('Error uploading model version:', error);
    },
  });
}

/**
 * Fetch model versions for a monument
 */
export function useModelVersions(monumentId) {
  return useQuery({
    queryKey: ['modelVersions', monumentId],
    queryFn: () => apiService.getModelVersions(monumentId),
    enabled: !!monumentId,
  });
}

/**
 * Activate a specific model version
 */
export function useActivateModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, versionId }) =>
      apiService.activateModelVersion(monumentId, versionId),
    onSuccess: (_, variables) => {
      const { monumentId } = variables;

      // Invalidate model versions and monument caches
      queryClient.invalidateQueries({
        queryKey: ['modelVersions', monumentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['monuments', monumentId],
      });

      // Invalidate AR experiences to reflect active model change
      queryClient.invalidateQueries({ queryKey: ['arExperiences', monumentId] });
    },
    onError: (error) => {
      console.error('Error activating model version:', error);
    },
  });
}

/**
 * Delete a model version
 */
export function useDeleteModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, versionId }) =>
      apiService.deleteModelVersion(monumentId, versionId),
    onSuccess: (_, variables) => {
      const { monumentId } = variables;

      // Invalidate model versions cache
      queryClient.invalidateQueries({
        queryKey: ['modelVersions', monumentId],
      });
    },
    onError: (error) => {
      console.error('Error deleting model version:', error);
    },
  });
}
