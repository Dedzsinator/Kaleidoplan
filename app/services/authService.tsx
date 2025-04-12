import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithCredential,
    User
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import api from './api';

// Get current authenticated user
export const getCurrentUser = (): User | null => {
    const auth = getAuth();
    return auth.currentUser;
};

// Email sign in
export const signIn = async (email: string, password: string) => {
    try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Get ID token
        const token = await userCredential.user.getIdToken();

        // Store token securely
        await SecureStore.setItemAsync('authToken', token);

        // Sync with backend
        await syncUserWithBackend(userCredential.user);

        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};

// Register new user
export const register = async (email: string, password: string, displayName: string) => {
    try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile
        await userCredential.user.updateProfile({ displayName });

        // Get ID token
        const token = await userCredential.user.getIdToken();

        // Store token securely
        await SecureStore.setItemAsync('authToken', token);

        // Sync with backend
        await syncUserWithBackend(userCredential.user, { displayName });

        return userCredential.user;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

// Sign out
export const signOut = async () => {
    try {
        const auth = getAuth();
        await firebaseSignOut(auth);

        // Clear stored tokens
        await SecureStore.deleteItemAsync('authToken');
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

// Update user profile
export const updateProfile = async (data: { displayName?: string, photoURL?: string }) => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('No authenticated user');
        }

        await user.updateProfile(data);

        // Sync with backend
        await syncUserWithBackend(user, data);

        return user;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

// Sync user data with backend
const syncUserWithBackend = async (user: User, additionalData = {}) => {
    try {
        await api.post('/auth/profile', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            ...additionalData
        });
    } catch (error) {
        console.error('Error syncing user with backend:', error);
        // Don't throw to avoid blocking auth flow
    }
};

// Get user profile from backend
export const getUserProfile = async () => {
    try {
        const response = await api.get('/auth/profile');
        return response.data;
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
};