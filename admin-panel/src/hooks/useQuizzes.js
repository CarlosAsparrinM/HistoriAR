import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

/**
 * Fetch quizzes with pagination and filters
 */
export function useQuizzes(params = {}) {
  return useQuery({
    queryKey: ['quizzes', params],
    queryFn: () => apiService.getQuizzes(params),
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
  });
}

/**
 * Fetch all quizzes for a monument
 */
export function useQuizzesByMonument(monumentId) {
  return useQuery({
    queryKey: ['quizzes', { monumentId }],
    queryFn: () => apiService.getQuizzes({ monumentId }),
    enabled: !!monumentId,
  });
}

/**
 * Fetch a single quiz
 */
export function useQuizById(quizId) {
  return useQuery({
    queryKey: ['quizzes', quizId],
    queryFn: () => apiService.getQuiz(quizId),
    enabled: !!quizId,
  });
}

/**
 * Create a new quiz
 */
export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createQuiz(data),
    onSuccess: (newQuiz) => {
      queryClient.invalidateQueries({
        queryKey: ['quizzes'],
      });

      queryClient.setQueryData(['quizzes', { page: 1 }], (oldData) => {
        if (!oldData) return { items: [newQuiz], total: 1 };
        return {
          items: [newQuiz, ...(oldData.items || [])],
          total: (oldData.total || 0) + 1,
        };
      });
    },
    onError: (error) => {
      console.error('Error creating quiz:', error);
    },
  });
}

/**
 * Update an existing quiz
 */
export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, data }) =>
      apiService.updateQuiz(quizId, data),
    onSuccess: (updatedQuiz, variables) => {
      const { quizId } = variables;

      queryClient.setQueryData(['quizzes', quizId], updatedQuiz);

      queryClient.setQueryData(
        ['quizzes'],
        (oldData) => {
          if (!oldData || !oldData.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((q) =>
              q._id === updatedQuiz._id ? updatedQuiz : q
            ),
          };
        }
      );
    },
    onError: (error) => {
      console.error('Error updating quiz:', error);
    },
  });
}

/**
 * Delete a quiz
 */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId) => apiService.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['quizzes'],
      });
    },
    onError: (error) => {
      console.error('Error deleting quiz:', error);
    },
  });
}
