const DEFAULT_PROD_URL = "https://credora-wallet-backend.onrender.com/api";
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? `http://${window.location.hostname}:5000` : DEFAULT_PROD_URL);

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    signup: async (email: string, password: string, name: string, role: string, extraFields?: Record<string, string>) => {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, ...extraFields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      return data;
    },
    getNonce: async (walletAddress: string, role?: string, extraFields?: Record<string, string>) => {
      const res = await fetch(`${API_URL}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, role, ...extraFields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to get nonce');
      return data;
    },
    verifyWallet: async (walletAddress: string, signature: string) => {
      const res = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });
      if (!res.ok) throw new Error('Failed to verify wallet');
      return res.json();
    },
    getMe: async (token: string) => {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get user');
      return res.json();
    },
    updateMe: async (data: any, token: string) => {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    }
  },
  credentials: {
    getAll: async (token: string) => {
      const res = await fetch(`${API_URL}/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch credentials');
      return res.json();
    },
    getById: async (id: string, token: string) => {
      const res = await fetch(`${API_URL}/credentials/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch credential');
      return res.json();
    },
    issue: async (formData: FormData, token: string) => {
      const res = await fetch(`${API_URL}/credentials/issue`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to issue credential');
      return data;
    },
    getIssued: async (token: string) => {
      const res = await fetch(`${API_URL}/credentials/issued`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch issued credentials');
      return res.json();
    },
    revoke: async (id: string, token: string) => {
      const res = await fetch(`${API_URL}/credentials/revoke/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke credential');
      return res.json();
    }
  },
  verify: {
    verifyCredentialObj: async (credentialHash: string) => {
      const res = await fetch(`${API_URL}/verify/${credentialHash}`);
      if (!res.ok) throw new Error('Verification failed');
      return res.json();
    }
  },
  shares: {
    create: async (credentialId: string, expiresIn: number, token: string) => {
      const res = await fetch(`${API_URL}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ credentialId, expiresIn }),
      });
      if (!res.ok) throw new Error('Failed to create share');
      return res.json();
    },
    getAll: async (token: string) => {
      const res = await fetch(`${API_URL}/shares`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch shares');
      return res.json();
    },
    revoke: async (id: string, token: string) => {
      const res = await fetch(`${API_URL}/shares/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke share');
      return res.json();
    },
    access: async (token: string) => {
      const res = await fetch(`${API_URL}/shares/access/${token}`);
      if (!res.ok) throw new Error('Failed to access share');
      return res.json();
    }
  },
  devrep: {
    getScore: async (walletAddress: string) => {
      const res = await fetch(`${API_URL}/devrep/${walletAddress}`);
      if (!res.ok) return { score: 0 }; // Fallback
      return res.json();
    },
    updateScore: async (githubRepos: number, token: string) => {
      const res = await fetch(`${API_URL}/devrep/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ githubRepos })
      });
      if (!res.ok) throw new Error('Failed to update Dev Rep Score');
      return res.json();
    }
  },
  github: {
    getStats: async (username: string) => {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`);
      if (!res.ok) throw new Error('GitHub api call failed');
      return res.json();
    }
  },
  certificates: {
    create: async (formData: FormData, token: string) => {
      const res = await fetch(`${API_URL}/certificates/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create certificate draft');
      return data;
    },
    getAll: async (token: string) => {
      const res = await fetch(`${API_URL}/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
    getById: async (hash: string, token: string) => {
      const res = await fetch(`${API_URL}/certificates/${hash}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch certificate');
      return res.json();
    },
    verify: async (hash: string) => {
      const res = await fetch(`${API_URL}/certificates/verify/${hash}`);
      if (!res.ok) throw new Error('Failed to verify certificate');
      return res.json();
    },
    updateState: async (hash: string, newState: string, token: string) => {
      const res = await fetch(`${API_URL}/certificates/${hash}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newState }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update certificate state');
      return data;
    }
  }
};
