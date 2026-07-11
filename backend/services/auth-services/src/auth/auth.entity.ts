export interface UserEntity {
    id: number;
    username: string;
    email: string;
    password_hash?: string; // google-user doesnt have password
    role: string;
    at_created?: Date;
}