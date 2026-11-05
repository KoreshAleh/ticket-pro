import { createContext } from 'react';

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    avatar?: string;
    balance?: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => {},
    refreshUser: async () => {}
});
