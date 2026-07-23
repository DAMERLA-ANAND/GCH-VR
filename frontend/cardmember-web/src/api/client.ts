import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export const cardmemberUserId = '00000000-0000-0000-0000-000000000001';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'X-Endpoint-API-UserInfo': `role=CARDMEMBER;user_id=${cardmemberUserId};email=alice@example.com`,
  },
});

export interface DisputeSummary {
  id: string;
  category: string;
  status: string;
  amount: number;
  currency: string;
  filed_at: string;
  evidence_deadline: string;
  verdict?: {
    outcome: string;
    explanation: string;
    confidence: number;
    issued_by: string;
  };
}

export interface DisputeDetail extends DisputeSummary {
  cardmember_id: string;
  merchant_id: string;
  transaction_ref: string;
  description: string;
  resolved_at?: string;
  evidence_count: number;
  mediated_requests_count: number;
}

export interface TimelineEvent {
  action: string;
  actor: string;
  timestamp: string;
  detail: any;
}

export interface MediatedRequest {
  id: string;
  dispute_id: string;
  requested_by: string;
  request_type: string;
  message: string;
  response_text?: string;
  response_gcs_uri?: string;
  status: string;
  created_at: string;
  responded_at?: string;
}

export const fetchDisputes = async (): Promise<{ items: DisputeSummary[] }> => {
  const res = await apiClient.get('/api/v1/disputes');
  return res.data;
};

export const fetchDisputeDetail = async (id: string): Promise<DisputeDetail> => {
  const res = await apiClient.get(`/api/v1/disputes/${id}`);
  return res.data;
};

export const fetchTimeline = async (id: string): Promise<{ events: TimelineEvent[] }> => {
  const res = await apiClient.get(`/api/v1/disputes/${id}/timeline`);
  return res.data;
};

export const fileDispute = async (data: {
  transaction_ref: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
}) => {
  const res = await apiClient.post('/api/v1/disputes', data);
  return res.data;
};

export const uploadEvidence = async (disputeId: string, file: File, evidenceType: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('evidence_type', evidenceType);

  const res = await axios.post(`${API_BASE}/api/v1/disputes/${disputeId}/evidence`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Endpoint-API-UserInfo': `role=CARDMEMBER;user_id=${cardmemberUserId};email=alice@example.com`,
    },
  });
  return res.data;
};

export const submitAppeal = async (disputeId: string, reason: string, simulateAi: boolean) => {
  const res = await apiClient.post(`/api/v1/disputes/${disputeId}/appeal`, {
    reason,
    simulate_ai_reviewer: simulateAi,
  });
  return res.data;
};

export const fetchMediatedRequests = async (disputeId: string): Promise<{ items: MediatedRequest[] }> => {
  const res = await apiClient.get(`/api/v1/disputes/${disputeId}/mediated-requests`);
  return res.data;
};

export const respondMediatedRequest = async (disputeId: string, requestId: string, responseText: string) => {
  const res = await apiClient.post(`/api/v1/disputes/${disputeId}/mediated-requests/${requestId}/respond`, {
    response_text: responseText,
  });
  return res.data;
};

export const seedDemoData = async () => {
  const res = await apiClient.post('/api/v1/prototype/seed');
  return res.data;
};
