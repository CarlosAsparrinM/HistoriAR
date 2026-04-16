export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  buildQueryString(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

    return new URLSearchParams(cleanParams).toString();
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Manejar tokens expirados o inválidos
      if (response.status === 401 || response.status === 403) {
        // Limpiar datos de autenticación
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Recargar la página para forzar el logout
        window.location.reload();
        
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      
      const error = await response.json().catch(() => ({ message: 'Error de red' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Monuments
  async getMonuments(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/monuments${queryString ? `?${queryString}` : ''}`);
  }

  async getMonument(id) {
    return this.request(`/monuments/${id}`);
  }

  async createMonument(data) {
    return this.request('/monuments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMonument(id, data) {
    return this.request(`/monuments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMonument(id) {
    return this.request(`/monuments/${id}`, {
      method: 'DELETE',
    });
  }

  async getMonumentStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/monuments/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Institutions
  async getInstitutions(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/institutions${queryString ? `?${queryString}` : ''}`);
  }

  async getInstitution(id) {
    return this.request(`/institutions/${id}`);
  }

  async createInstitution(data) {
    return this.request('/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInstitution(id, data) {
    return this.request(`/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInstitution(id) {
    return this.request(`/institutions/${id}`, {
      method: 'DELETE',
    });
  }

  async getInstitutionStats() {
    return this.request('/institutions/stats');
  }

  // Users
  async getUsers(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Visits
  async getVisits(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/visits${queryString ? `?${queryString}` : ''}`);
  }

  // Categories
  async getCategories(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/categories${queryString ? `?${queryString}` : ''}`);
  }

  async getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategoryStats() {
    return this.request('/categories/stats');
  }

  // Cultures
  async getCultures(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/cultures${queryString ? `?${queryString}` : ''}`);
  }

  async getCulture(id) {
    return this.request(`/cultures/${id}`);
  }

  async createCulture(data) {
    return this.request('/cultures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCulture(id, data) {
    return this.request(`/cultures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCulture(id) {
    return this.request(`/cultures/${id}`, {
      method: 'DELETE',
    });
  }

  async getCultureStats() {
    return this.request('/cultures/stats');
  }

  // Quizzes
  async getQuizzes(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/quizzes${queryString ? `?${queryString}` : ''}`);
  }

  async getQuiz(id) {
    return this.request(`/quizzes/${id}`);
  }

  async createQuiz(data) {
    return this.request('/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuiz(id, data) {
    return this.request(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuiz(id) {
    return this.request(`/quizzes/${id}`, {
      method: 'DELETE',
    });
  }

  // Tours
  async getTours(params = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(`/tours${queryString ? `?${queryString}` : ''}`);
  }

  async getTour(id) {
    return this.request(`/tours/${id}`);
  }

  async createTour(data) {
    return this.request('/tours', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTour(id, data) {
    return this.request(`/tours/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTour(id) {
    return this.request(`/tours/${id}`, {
      method: 'DELETE',
    });
  }

  async getToursByInstitution(institutionId, activeOnly = true) {
    return this.request(`/tours/institution/${institutionId}?activeOnly=${activeOnly}`);
  }

  // S3 signed uploads
  buildStorageKey({ entityType, entityId, folder, fileName }) {
    const safeFileName = fileName.replace(/\s+/g, '_');
    const normalizedFolder = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : '';
    return `${normalizedFolder}${entityType}/${entityId}/${Date.now()}_${safeFileName}`;
  }

  async getPresignedUploadUrl({ key, contentType, expiresIn = 3600 }) {
    return this.request('/uploads/signed-url', {
      method: 'POST',
      body: JSON.stringify({ key, contentType, expiresIn }),
    });
  }

  async uploadFileToPresignedUrl(presignedUrl, file) {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Error al subir a S3: ${response.status}`);
    }

    return true;
  }

  async confirmModelVersionUpload(monumentId, payload) {
    return this.request(`/monuments/${monumentId}/model-versions/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Model Versions
  async getModelVersions(monumentId) {
    return this.request(`/monuments/${monumentId}/model-versions`);
  }

  async uploadModelVersion(monumentId, file) {
    // Upload 3D model version to S3 via backend
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('model', file);

    const url = `${this.baseURL}/monuments/${monumentId}/upload-model`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      const error = await response.json().catch(() => ({ message: 'Error de red' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async activateModelVersion(monumentId, versionId) {
    return this.request(`/monuments/${monumentId}/model-versions/${versionId}/activate`, {
      method: 'POST',
    });
  }

  async restoreModelVersion(monumentId, versionId) {
    // Deprecated: Use activateModelVersion instead
    return this.activateModelVersion(monumentId, versionId);
  }

  async deleteModelVersion(monumentId, versionId) {
    try {
      return await this.request(`/monuments/${monumentId}/model-versions/${versionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Enhanced error handling for specific error codes
      if (error.message.includes('active version') || error.message.includes('ACTIVE_VERSION_DELETE')) {
        throw new Error('No se puede eliminar la versión activa. Por favor, activa otra versión primero.');
      }
      if (error.message.includes('not found') || error.message.includes('VERSION_NOT_FOUND')) {
        throw new Error('La versión del modelo no fue encontrada.');
      }
      throw error;
    }
  }

  // Historical Data
  async getHistoricalDataByMonument(monumentId) {
    return this.request(`/monuments/${monumentId}/historical-data`);
  }

  async getHistoricalDataById(id) {
    return this.request(`/historical-data/${id}`);
  }

  async createHistoricalData(monumentId, data, imageFile) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.discoveryInfo) formData.append('discoveryInfo', data.discoveryInfo);
    if (data.activities) formData.append('activities', JSON.stringify(data.activities));
    if (data.sources) formData.append('sources', JSON.stringify(data.sources));
    if (imageFile) formData.append('image', imageFile);

    const token = localStorage.getItem('token');
    const url = `${this.baseURL}/monuments/${monumentId}/historical-data`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      
      const error = await response.json().catch(() => ({ message: 'Error de red' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateHistoricalData(id, data, imageFile) {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.discoveryInfo !== undefined) formData.append('discoveryInfo', data.discoveryInfo);
    if (data.activities) formData.append('activities', JSON.stringify(data.activities));
    if (data.sources) formData.append('sources', JSON.stringify(data.sources));
    if (imageFile) formData.append('image', imageFile);

    const token = localStorage.getItem('token');
    const url = `${this.baseURL}/historical-data/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      
      const error = await response.json().catch(() => ({ message: 'Error de red' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteHistoricalData(id) {
    return this.request(`/historical-data/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderHistoricalData(monumentId, items) {
    return this.request(`/monuments/${monumentId}/historical-data/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }
}

export default new ApiService();
