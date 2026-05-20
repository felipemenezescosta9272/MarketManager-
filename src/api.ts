export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const savedUser = localStorage.getItem('user');
  const user = (savedUser && savedUser !== 'undefined') ? JSON.parse(savedUser) : null;
  const headers = {
    ...options.headers as any,
    'Content-Type': 'application/json',
  };
  
  if (user?.id) {
    headers['x-user-id'] = user.id.toString();
  } else {
    console.warn(`apiFetch: No user ID found in localStorage for ${url}`);
  }

  const method = options.method || 'GET';
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, { ...options, method, headers });
      
      if (response.status === 429 && attempts < maxAttempts - 1) {
        attempts++;
        // Use exponential backoff: 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, attempts * 500));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`) as any;
        error.status = response.status;
        throw error;
      }
      return response.json();
    } catch (err) {
      if (attempts < maxAttempts - 1 && (err as any).status === 429) {
        attempts++;
        continue;
      }
      throw err;
    }
  }
};
