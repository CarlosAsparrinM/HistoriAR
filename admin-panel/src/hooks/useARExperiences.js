import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

/**
 * Fetch AR experiences (currently using monuments as AR content)
 * This is a placeholder for future dedicated AR experience endpoints
 */
export function useARExperiences(params = {}) {
  return useQuery({
    queryKey: ['arExperiences', params],
    queryFn: () => apiService.getMonuments(params), // Currently using monuments
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
    // Always refetch when the component mounts to ensure lists reflect recent changes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch a single AR experience
 */
export function useARExperienceById(experienceId) {
  return useQuery({
    queryKey: ['arExperiences', experienceId],
    queryFn: () => apiService.getMonument(experienceId), // Currently using monument
    enabled: !!experienceId,
  });
}

/**
 * Upload/Update AR model for an experience
 */
export function useUploadARModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, file }) =>
      apiService.uploadModelVersion(monumentId, file),
    onSuccess: (result, variables) => {
      const { monumentId } = variables;

      // Invalidate AR experience cache
      queryClient.invalidateQueries({
        queryKey: ['arExperiences', monumentId],
      });

      // Invalidate model versions cache
      queryClient.invalidateQueries({
        queryKey: ['modelVersions', monumentId],
      });
    },
    onError: (error) => {
      console.error('Error uploading AR model:', error);
    },
  });
}

/**
 * Activate AR model version
 */
export function useActivateARModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, versionId }) =>
      apiService.activateModelVersion(monumentId, versionId),
    onSuccess: (_, variables) => {
      const { monumentId } = variables;

      queryClient.invalidateQueries({
        queryKey: ['arExperiences', monumentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['modelVersions', monumentId],
      });
    },
    onError: (error) => {
      console.error('Error activating AR model:', error);
    },
  });
}

/**
 * Fetch AR model versions
 */
export function useARModelVersions(experienceId) {
  return useQuery({
    queryKey: ['arModelVersions', experienceId],
    queryFn: () => apiService.getModelVersions(experienceId),
    enabled: !!experienceId,
  });
}

/**
 * Delete AR model version
 */
export function useDeleteARModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monumentId, versionId }) =>
      apiService.deleteModelVersion(monumentId, versionId),
    onSuccess: (_, variables) => {
      const { monumentId } = variables;

      queryClient.invalidateQueries({ queryKey: ['arModelVersions', monumentId] });
      queryClient.invalidateQueries({ queryKey: ['arExperiences', monumentId] });
    },
    onError: (error) => {
      console.error('Error deleting AR model version:', error);
    },
  });
}
