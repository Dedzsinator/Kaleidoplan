import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup,
    updateProfile,
    GoogleAuthProvider,
    signOut
  } from 'firebase/auth';
  import { auth } from '@/app/firebase';
  import { createUserInDatabase, updateUserRole } from './dbService';
  
  // Register with email/password
  export const register = async (email: string, password: string, displayName: string) => {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name
    await updateProfile(userCredential.user, { displayName });
    
    // Add user to database
    await createUserInDatabase(
      userCredential.user.uid, 
      email, 
      displayName, 
      'guest'
    );
    
    return userCredential.user;
  };
  
  // Login with email/password
  export const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };
  
  // Login with Google
  export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if this is a new user
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    
    if (isNewUser) {
      // Add the Google user to our database
      await createUserInDatabase(
        result.user.uid,
        result.user.email || '',
        result.user.displayName || 'Google User',
        'guest'
      );
    }
    
    return result.user;
  };
  
  // Logout
  export const logout = async () => {
    await signOut(auth);
  };
  
  // Promote user to admin (requires admin privileges)
  export const makeAdmin = async (userId: string) => {
    await updateUserRole(userId, 'admin');
  };
  
  // Set user as organizer (requires admin privileges)
  export const makeOrganizer = async (userId: string) => {
    await updateUserRole(userId, 'organizer');
  };
  
  // Reset to regular user (requires admin privileges)
  export const makeGuest = async (userId: string) => {
    await updateUserRole(userId, 'guest');
  };