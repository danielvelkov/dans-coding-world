import axios from 'axios';
export async function login(email: string, password: string) {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('email', email);
  urlSearchParams.append('password', password);

  return await axios.post('/api/v1/auth/login', urlSearchParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export async function renewAuthToken(token: string) {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('token', token);

  return await axios.post('/api/v1/auth/refresh', urlSearchParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
