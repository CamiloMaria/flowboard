export interface UserPayload {
    sub: string;
    email?: string;
    name: string;
    color: string;
    role: 'user' | 'guest';
}
export interface TokenResponse {
    accessToken: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    name: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
