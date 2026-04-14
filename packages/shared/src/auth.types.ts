export interface UserPayload {
  sub: string;
  email?: string; // Not present on guest tokens
  name: string;
  color: string;
  role: 'user' | 'guest';
}

export interface TokenResponse {
  accessToken: string;
}


