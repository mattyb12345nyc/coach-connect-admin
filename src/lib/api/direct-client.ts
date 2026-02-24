/**
 * Direct API Client for CustomGPT
 * 
 * This client communicates directly with the CustomGPT API using an API key.
 * Used for standalone widget deployments where a proxy server is not available.
 * 
 * SECURITY WARNING: This exposes your API key in the browser. Only use this
 * for trusted environments or with restricted API keys.
 */

import type {
  Agent,
  AgentStats,
  AgentSettings,
  Conversation,
  ChatMessage,
  Citation,
  APIResponse,
  AgentsResponse,
  ConversationsResponse,
  MessagesResponse,
  MessageResponse,
  APIMessageResponse,
  CitationResponse,
  StreamChunk,
  LimitsResponse,
} from '@/types';
import type { 
  PagesListResponse, 
  DeletePageResponse, 
  ReindexPageResponse, 
  PagesQueryParams,
  PageMetadata,
  PageMetadataResponse
} from '@/types/pages.types';
import type { 
  TrafficReportResponse, 
  QueriesReportResponse, 
  ConversationsReportResponse, 
  AnalysisReportResponse,
  AnalysisInterval
} from '@/types/reports.types';
import type { 
  SourcesListResponse, 
  SourceResponse, 
  DeleteSourceResponse,
  UpdateSourceSettingsRequest,
  CreateSitemapSourceRequest
} from '@/types/sources.types';
import { parseStreamChunk } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { UserProfile } from '@/types';

/**
 * DirectCustomGPTClient
 * 
 * Client that communicates directly with CustomGPT API using an API key.
 * This is used for standalone widget deployments without a proxy server.
 */
export class DirectCustomGPTClient {
  private baseURL: string = 'https://app.customgpt.ai/api/v1';
  private apiKey: string;
  private timeout: number = 30000;
  private abortControllers: Map<string, AbortController> = new Map();
  private demoApiKey: string | null = null;

  constructor(apiKey: string, baseURL?: string) {
    if (!apiKey) {
      throw new Error('API key is required for direct client');
    }
    
    this.apiKey = apiKey;
    if (baseURL) {
      this.baseURL = baseURL;
    }
    
    logger.info('DIRECT_CLIENT', 'Direct API Client initialized', {
      baseURL: this.baseURL,
      hasApiKey: !!apiKey,
    });
  }

  /**
   * Make a request to the CustomGPT API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `${options.method || 'GET'}-${endpoint}-${Date.now()}`;
    
    logger.apiRequest(endpoint, options.method || 'GET', options.body);

    try {
      const controller = new AbortController();
      this.abortControllers.set(requestId, controller);

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      // Don't set Content-Type for FormData - let browser set it with boundary
      const isFormData = options.body instanceof FormData;
      const headers: HeadersInit = {
        'accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(options.headers as Record<string, string> || {}),
      };
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        // Non-JSON response, wrap it
        const text = await response.text();
        responseData = { 
          status: response.ok ? 'success' : 'error', 
          data: text,
          message: text 
        };
      }

      if (!response.ok) {
        throw {
          message: responseData.error || responseData.message || `Request failed: ${response.status}`,
          status: response.status,
          data: responseData,
        };
      }

      logger.apiResponse(endpoint, response.status, responseData);
      return responseData;
    } catch (error: any) {
      this.abortControllers.delete(requestId);
      
      if (error.name === 'AbortError') {
        logger.apiError(endpoint, { message: 'Request timeout', code: 'TIMEOUT' });
        throw new Error('Request timeout');
      }

      logger.apiError(endpoint, error);
      throw error;
    }
  }

  /**
   * Make a streaming request to the API
   */
  private async streamRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseURL}${endpoint}`;
    
    logger.apiRequest(endpoint, 'POST-STREAM', options.body);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string> || {})
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Stream request failed: ${response.status}`;
      try {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If not JSON, use the status message
      }
      logger.apiError(endpoint, { message: errorMessage, status: response.status });
      throw new Error(errorMessage);
    }

    logger.apiResponse(endpoint, response.status, 'Stream started');

    return response.body!;
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(endpoint: string, method: string = 'GET'): void {
    const controllers = Array.from(this.abortControllers.entries());
    controllers.forEach(([key, controller]) => {
      if (key.includes(`${method}-${endpoint}`)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    });
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Set demo mode API key
   */
  public setDemoApiKey(apiKey: string | null) {
    this.demoApiKey = apiKey;
  }

  // Agent Management
  async getAgents(params?: {
    page?: number;
    per_page?: number;
  }): Promise<AgentsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString();
    return this.request(`/projects${queryString ? `?${queryString}` : ''}`);
  }

  async getAgent(id: number): Promise<APIResponse<Agent>> {
    return this.request(`/projects/${id}`);
  }

  async createAgent(data: {
    project_name: string;
    sitemap_path?: string;
    file_upload?: boolean;
    webpage_url?: string;
  }): Promise<APIResponse<Agent>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentSettings(id: number): Promise<APIResponse<AgentSettings>> {
    return this.request(`/projects/${id}/settings`);
  }

  async updateAgentSettings(id: number, settings: Partial<AgentSettings> | FormData): Promise<APIResponse<AgentSettings>> {
    const isFormData = settings instanceof FormData;
    return this.request(`/projects/${id}/settings`, {
      method: 'POST',
      body: isFormData ? settings : JSON.stringify(settings),
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  }

  // Conversation Management
  async getConversations(projectId: number, params?: {
    page?: number;
    per_page?: number;
  }): Promise<ConversationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString();
    return this.request(`/projects/${projectId}/conversations${queryString ? `?${queryString}` : ''}`);
  }

  async createConversation(projectId: number, data?: { name?: string }): Promise<APIResponse<Conversation>> {
    return this.request(`/projects/${projectId}/conversations`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async updateConversation(
    projectId: number,
    sessionId: string,
    data: { name?: string }
  ): Promise<APIResponse<Conversation>> {
    return this.request(`/projects/${projectId}/conversations/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(projectId: number, sessionId: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.request(`/projects/${projectId}/conversations/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async exportConversation(
    projectId: number,
    sessionId: string,
    params?: { format?: string }
  ): Promise<APIResponse<unknown>> {
    const queryParams = new URLSearchParams();
    if (params?.format) queryParams.append('format', params.format);
    const queryString = queryParams.toString();
    return this.request(
      `/projects/${projectId}/conversations/${sessionId}/export${queryString ? `?${queryString}` : ''}`,
      { headers: { Accept: 'application/json, text/plain, */*' } }
    );
  }

  // Message Management
  async getMessages(
    projectId: number,
    sessionId: string,
    params?: {
      page?: number;
      per_page?: number;
    }
  ): Promise<MessagesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const queryString = queryParams.toString();
    return this.request(`/projects/${projectId}/conversations/${sessionId}/messages${queryString ? `?${queryString}` : ''}`);
  }

  async getMessageById(
    projectId: number,
    sessionId: string,
    messageId: number
  ): Promise<APIMessageResponse> {
    return this.request(`/projects/${projectId}/conversations/${sessionId}/messages/${messageId}`);
  }

  async sendMessage(
    projectId: number,
    sessionId: string,
    data: {
      prompt: string;
      stream?: boolean;
      source_ids?: string[];
      response_source?: string;
      chatbot_model?: string;
      custom_persona?: string;
      agent_capability?: string;
    }
  ): Promise<MessageResponse> {
    return this.request(`/projects/${projectId}/conversations/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendMessageStream(
    projectId: number,
    sessionId: string,
    data: {
      prompt: string;
      source_ids?: string[];
      response_source?: string;
      chatbot_model?: string;
      custom_persona?: string;
      agent_capability?: string;
    },
    onChunk: (chunk: StreamChunk) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const stream = await this.streamRequest(
        `/projects/${projectId}/conversations/${sessionId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ ...data, stream: true }),
        }
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onComplete?.();
                return;
              }
              const chunk = parseStreamChunk(data);
              if (chunk) {
                onChunk(chunk);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    } catch (error: any) {
      onError?.(error);
      throw error;
    }
  }

  async updateMessageFeedback(
    projectId: number,
    sessionId: string,
    messageId: number,
    feedback: { feedback: 'thumbs_up' | 'thumbs_down' }
  ): Promise<MessageResponse> {
    return this.request(`/projects/${projectId}/conversations/${sessionId}/messages/${messageId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify(feedback),
    });
  }

  // Citations
  async getCitation(projectId: number, citationId: number): Promise<CitationResponse> {
    return this.request(`/projects/${projectId}/citations/${citationId}`);
  }

  async previewCitationFile(id: string): Promise<any> {
    // Note: This endpoint might need authentication adjustments
    return this.request(`/preview/${id}`);
  }

  // Reports
  async getTrafficReport(projectId: number): Promise<TrafficReportResponse> {
    return this.request(`/projects/${projectId}/reports/traffic`);
  }

  async getQueriesReport(projectId: number): Promise<QueriesReportResponse> {
    return this.request(`/projects/${projectId}/reports/queries`);
  }

  async getConversationsReport(projectId: number): Promise<ConversationsReportResponse> {
    return this.request(`/projects/${projectId}/reports/conversations`);
  }

  async getAnalysisReport(projectId: number, interval?: AnalysisInterval): Promise<AnalysisReportResponse> {
    const queryParams = new URLSearchParams();
    if (interval) queryParams.append('interval', interval);
    
    const queryString = queryParams.toString();
    return this.request(`/projects/${projectId}/reports/analysis${queryString ? `?${queryString}` : ''}`);
  }

  // Pages
  async getPages(
    projectId: number,
    params?: PagesQueryParams
  ): Promise<PagesListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.order) queryParams.append('order', params.order);
    if (params?.crawl_status) queryParams.append('crawl_status', params.crawl_status);
    if (params?.index_status) queryParams.append('index_status', params.index_status);
    
    const queryString = queryParams.toString();
    return this.request(`/projects/${projectId}/pages${queryString ? `?${queryString}` : ''}`);
  }

  async deletePage(projectId: number, pageId: number): Promise<DeletePageResponse> {
    return this.request(`/projects/${projectId}/pages/${pageId}`, {
      method: 'DELETE',
    });
  }

  async reindexPage(projectId: number, pageId: number): Promise<ReindexPageResponse> {
    return this.request(`/projects/${projectId}/pages/${pageId}/reindex`, {
      method: 'POST',
    });
  }

  async getPageMetadata(projectId: number, pageId: number): Promise<PageMetadataResponse> {
    return this.request(`/projects/${projectId}/pages/${pageId}/metadata`);
  }

  async updatePageMetadata(
    projectId: number,
    pageId: number,
    metadata: Partial<PageMetadata>
  ): Promise<PageMetadataResponse> {
    return this.request(`/projects/${projectId}/pages/${pageId}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(metadata),
    });
  }

  // Sources
  async getSources(projectId: number): Promise<SourcesListResponse> {
    return this.request(`/projects/${projectId}/sources`);
  }

  async createSitemapSource(
    projectId: number,
    data: CreateSitemapSourceRequest
  ): Promise<SourceResponse> {
    const formData = new FormData();
    formData.append('sitemap_path', data.sitemap_path);
    if (data.executive_js !== undefined) {
      formData.append('executive_js', String(data.executive_js));
    }
    if (data.data_refresh_frequency !== undefined) {
      formData.append('data_refresh_frequency', data.data_refresh_frequency);
    }
    if (data.create_new_pages !== undefined) {
      formData.append('create_new_pages', String(data.create_new_pages));
    }
    if (data.remove_unexist_pages !== undefined) {
      formData.append('remove_unexist_pages', String(data.remove_unexist_pages));
    }
    if (data.refresh_existing_pages !== undefined) {
      formData.append('refresh_existing_pages', data.refresh_existing_pages);
    }

    return this.request(`/projects/${projectId}/sources`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async uploadFileSource(projectId: number, formData: FormData): Promise<SourceResponse> {
    return this.request(`/projects/${projectId}/sources`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async updateSourceSettings(
    projectId: number,
    sourceId: number,
    settings: UpdateSourceSettingsRequest
  ): Promise<SourceResponse> {
    return this.request(`/projects/${projectId}/sources/${sourceId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async deleteSource(projectId: number, sourceId: number): Promise<DeleteSourceResponse> {
    return this.request(`/projects/${projectId}/sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  async instantSyncSource(projectId: number, sourceId: number): Promise<SourceResponse> {
    return this.request(`/projects/${projectId}/sources/${sourceId}/instant-sync`, {
      method: 'PUT',
    });
  }

  // File Upload
  async uploadFile(projectId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request(`/projects/${projectId}/sources`, {
      method: 'POST',
      body: formData,
    });
  }

  // User
  async getUserLimits(): Promise<LimitsResponse> {
    return this.request('/user/limits');
  }

  async getUserProfile(): Promise<{ status: 'success' | 'error'; data: UserProfile }> {
    return this.request('/user');
  }

  async updateUserProfile(formData: FormData): Promise<{ status: 'success' | 'error'; data: UserProfile }> {
    return this.request('/user', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type with boundary
    });
  }

  // Additional methods for full compatibility
  async updateAgent(id: number, data: { project_name?: string; are_licenses_allowed?: boolean; is_shared?: boolean; sitemap_path?: string }): Promise<APIResponse<Agent>> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    return this.request(`/projects/${id}`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteAgent(id: number): Promise<APIResponse<{ deleted: boolean }>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getAgentStats(id: number): Promise<APIResponse<AgentStats>> {
    return this.request(`/projects/${id}/stats`);
  }

  async replicateAgent(id: number): Promise<APIResponse<Agent>> {
    return this.request(`/projects/${id}/replicate`, {
      method: 'POST',
    });
  }

  // Licenses
  async getLicenses(projectId: number): Promise<APIResponse<any[]>> {
    return this.request(`/projects/${projectId}/license_keys`);
  }

  async createLicense(projectId: number, data: { name: string }): Promise<APIResponse<any>> {
    return this.request(`/projects/${projectId}/license_keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLicense(projectId: number, licenseId: string): Promise<APIResponse<any>> {
    return this.request(`/projects/${projectId}/license_keys/${licenseId}`);
  }

  async updateLicense(
    projectId: number,
    licenseId: string,
    data: { name?: string; is_active?: boolean }
  ): Promise<APIResponse<any>> {
    return this.request(`/projects/${projectId}/license_keys/${licenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLicense(projectId: number, licenseId: string): Promise<APIResponse<any>> {
    return this.request(`/projects/${projectId}/license_keys/${licenseId}`, {
      method: 'DELETE',
    });
  }

  // Plugin Management
  async getProjectPlugins(projectId: number): Promise<APIResponse<any[]>> {
    return this.request(`/projects/${projectId}/plugins`);
  }

  async updateProjectPlugin(
    projectId: number,
    pluginId: string,
    data: { enabled: boolean }
  ): Promise<APIResponse<{ updated: boolean }>> {
    return this.request(`/projects/${projectId}/plugins/${pluginId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton factory
export const createDirectClient = (apiKey: string, baseURL?: string) => {
  return new DirectCustomGPTClient(apiKey, baseURL);
};