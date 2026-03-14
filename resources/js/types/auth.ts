export interface AuthUserDto {
    id: number;
    name: string;
    email: string;
}

export interface LoginResponseDto {
    token: string;
    user: AuthUserDto;
}

export interface MeResponseDto {
    user: AuthUserDto;
}
