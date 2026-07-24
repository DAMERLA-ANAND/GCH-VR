import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export const merchantUserId = '00000000-0000-0000-0000-000000000002';
export const reviewerUserId = '00000000-0000-0000-0000-000000000003';
export const adminUserId = '00000000-0000-0000-0000-000000000004';

export const getMerchantClient = (role: 'MERCHANT' | 'REVIEWER' | 'ADMIN' = 'MERCHANT') => {
  const userId = role === 'ADMIN' ? adminUserId : role === 'REVIEWER' ? reviewerUserId : merchantUserId;
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      'X-Endpoint-API-UserInfo': `role=${role};user_id=${userId};merchant_id=${merchantUserId};email=merchant@example.com`,
    },
  });
};

export const fetchMerchantDisputes = async (status?: string, category?: string) => {
  const client = getMerchantClient('MERCHANT');
  const params: any = {};
  if (status) params.status = status;
  if (category) params.category = category;
  const res = await client.get('/api/v1/disputes', { params });
  return res.data;
};

export const fetchDisputeDetail = async (id: string) => {
  const client = getMerchantClient('MERCHANT');
  const res = await client.get(`/api/v1/disputes/${id}`);
  return res.data;
};

export const fetchDisputeEvidence = async (id: string) => {
  const client = getMerchantClient('MERCHANT');
  const res = await client.get(`/api/v1/disputes/${id}/evidence`);
  return res.data;
};

export const fetchMediatedRequests = async (id: string) => {
  const client = getMerchantClient('MERCHANT');
  const res = await client.get(`/api/v1/disputes/${id}/mediated-requests`);
  return res.data;
};

export const uploadMerchantEvidence = async (disputeId: string, file: File, evidenceType: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('evidence_type', evidenceType);

  const res = await axios.post(`${API_BASE}/api/v1/disputes/${disputeId}/evidence`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Endpoint-API-UserInfo': `role=MERCHANT;user_id=${merchantUserId};merchant_id=${merchantUserId};email=merchant@example.com`,
    },
  });
  return res.data;
};

export const sendMediatedRequest = async (disputeId: string, requestType: string, message: string) => {
  const client = getMerchantClient('MERCHANT');
  const res = await client.post(`/api/v1/disputes/${disputeId}/mediated-requests`, {
    request_type: requestType,
    message,
  });
  return res.data;
};

export const fetchRuleCategories = async () => {
  const client = getMerchantClient('ADMIN');
  const res = await client.get('/api/v1/admin/rules/categories');
  return res.data;
};

export const fetchRuleSet = async (category: string) => {
  const client = getMerchantClient('ADMIN');
  const res = await client.get(`/api/v1/admin/rules/${category}`);
  return res.data;
};

export const testRuleSet = async (category: string, ruleSet: any, mockEvidence: any[]) => {
  const client = getMerchantClient('ADMIN');
  const res = await client.post(`/api/v1/admin/rules/${category}/test`, {
    rule_set: ruleSet,
    mock_evidence: mockEvidence,
  });
  return res.data;
};

export const publishRuleSet = async (category: string, ruleSet: any) => {
  const client = getMerchantClient('ADMIN');
  const res = await client.put(`/api/v1/admin/rules/${category}`, ruleSet);
  return res.data;
};

export const fetchReviewQueue = async () => {
  const client = getMerchantClient('REVIEWER');
  const res = await client.get('/api/v1/reviews/queue');
  return res.data;
};

export const decideReview = async (appealId: string, outcome: 'UPHELD' | 'OVERTURNED', notes: string) => {
  const client = getMerchantClient('REVIEWER');
  const res = await client.post(`/api/v1/reviews/${appealId}/decide`, {
    appeal_outcome: outcome,
    review_notes: notes,
  });
  return res.data;
};

export const seedDemoData = async () => {
  const client = getMerchantClient('MERCHANT');
  const res = await client.post('/api/v1/prototype/seed');
  return res.data;
};
