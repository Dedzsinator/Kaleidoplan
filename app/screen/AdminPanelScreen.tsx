import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { useAuth } from '../contexts/AuthContext';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';
import {
  Container,
  Card,
  Title,
  Subtitle,
  BodyText,
  Label,
  Input,
  PrimaryButton,
  PrimaryButtonText,
  SecondaryButton,
  SecondaryButtonText,
  DangerButton,
  DangerButtonText,
  OutlineButton,
  OutlineButtonText,
  Badge,
  BadgeText,
  LoadingContainer,
  Spinner,
  LoadingText,
  ListItem,
  ListItemTitle,
  ListItemSubtitle,
  Row,
  Spacer,
  Header,
  HeaderTitle,
  HeaderSubtitle,
} from '../components/ui/theme';

// Get Firestore instance
const db = getFirestore();
const firebaseAuth = getAuth();

// Custom styled components for admin panel
const TabContainer = styled(View, 'flex-row bg-white mb-4 border-b border-gray-200');
const Tab = styled(TouchableOpacity, 'py-3 px-4');
const TabText = styled(Text, 'text-gray-600 text-base');
const ActiveTab = styled(TouchableOpacity, 'py-3 px-4 border-b-2 border-primary');
const ActiveTabText = styled(Text, 'text-primary font-medium text-base');
const CardHeader = styled(View, 'flex-row justify-between items-center mb-4');
const UserItem = styled(TouchableOpacity, 'bg-white p-4 mb-2 rounded-lg border border-gray-200');
const UserRole = styled(View, 'px-2 py-1 rounded-full bg-blue-100');
const UserRoleText = styled(Text, 'text-xs text-blue-700');
const AdminRole = styled(View, 'px-2 py-1 rounded-full bg-purple-100');
const AdminRoleText = styled(Text, 'text-xs text-purple-700');
const ModalContainer = styled(View, 'flex-1 justify-center p-5 bg-black/50');
const ModalContent = styled(View, 'bg-white rounded-lg p-5');
const ModalTitle = styled(Text, 'text-xl font-bold mb-4');
const ModalActions = styled(View, 'flex-row mt-4 gap-2');
const StatCard = styled(Card, 'p-4 mb-4');
const StatValue = styled(Text, 'text-2xl font-bold text-primary');
const StatLabel = styled(Text, 'text-sm text-gray-500');
const SearchBar = styled(View, 'flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-4');
const SearchInput = styled(Input, 'flex-1 bg-transparent border-0 mb-0 p-0');
const EmptyStateContainer = styled(View, 'py-8 items-center');
const EmptyStateText = styled(Text, 'text-gray-500 text-base mt-2');

// Tab types
type TabType = 'overview' | 'organizers' | 'events' | 'tasks';

// User interface
interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'organizer';
  createdAt?: string;
}

// Stats interface
interface Stats {
  organizerCount: number;
  eventCount: number;
  taskCount: number;
  pendingTaskCount: number;
}

const AdminPanelScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<Stats>({
    organizerCount: 0,
    eventCount: 0,
    taskCount: 0,
    pendingTaskCount: 0
  });

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersQuery = query(collection(db, 'users'));
        const querySnapshot = await getDocs(usersQuery);
        
        const loadedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          loadedUsers.push({
            id: doc.id,
            ...doc.data()
          } as User);
        });
        
        setUsers(loadedUsers);
        setFilteredUsers(loadedUsers);
        
        // Calculate statistics
        setStats({
          organizerCount: loadedUsers.filter(u => u.role === 'organizer').length,
          eventCount: 0, // You would fetch this from the events collection
          taskCount: 0, // You would fetch this from the tasks collection
          pendingTaskCount: 0 // You would fetch this from the tasks collection
        });
        
      } catch (error) {
        console.error('Error fetching users:', error);
        Alert.alert('Error', 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Filter users when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user => 
        (user.displayName?.toLowerCase().includes(query) || 
         user.email.toLowerCase().includes(query))
      ));
    }
  }, [searchQuery, users]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'organizer') => {
    try {
      setLoading(true);
      
      // Update user role in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      
      // Note: In a production environment, you would also update the user's custom claims
      // using Firebase Admin SDK through a secure backend function
      
      Alert.alert('Success', `User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setIsRoleModalVisible(false);
      setLoading(false);
    }
  };
  
  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // Note: In a real app, you would use Firebase Admin SDK through a secure backend
      // to delete the user authentication record
      
      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      Alert.alert('Success', 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user');
    } finally {
      setIsDeleteModalVisible(false);
      setLoading(false);
    }
  };
  
  // Render the overview tab
  const renderOverviewTab = () => {
    return (
      <ScrollView>
        <View className="flex-row flex-wrap gap-2">
          <StatCard className="w-[48%]">
            <StatLabel>Organizers</StatLabel>
            <StatValue>{stats.organizerCount}</StatValue>
          </StatCard>
          
          <StatCard className="w-[48%]">
            <StatLabel>Events</StatLabel>
            <StatValue>{stats.eventCount}</StatValue>
          </StatCard>
        </View>
        
        <View className="flex-row flex-wrap gap-2">
          <StatCard className="w-[48%]">
            <StatLabel>Total Tasks</StatLabel>
            <StatValue>{stats.taskCount}</StatValue>
          </StatCard>
          
          <StatCard className="w-[48%]">
            <StatLabel>Pending Tasks</StatLabel>
            <StatValue>{stats.pendingTaskCount}</StatValue>
          </StatCard>
        </View>
        
        <Card>
          <CardHeader>
            <Subtitle>Recent Organizers</Subtitle>
            <OutlineButton
              className="py-1 px-3"
              onPress={() => setActiveTab('organizers')}
            >
              <OutlineButtonText>View All</OutlineButtonText>
            </OutlineButton>
          </CardHeader>
          
          {users.filter(u => u.role === 'organizer').slice(0, 3).map(user => (
            <UserItem key={user.id} onPress={() => {
              setSelectedUser(user);
              setIsUserModalVisible(true);
            }}>
              <Row>
                <View className="flex-1">
                  <ListItemTitle>{user.displayName || 'No name'}</ListItemTitle>
                  <ListItemSubtitle>{user.email}</ListItemSubtitle>
                </View>
                <UserRole>
                  <UserRoleText>Organizer</UserRoleText>
                </UserRole>
              </Row>
            </UserItem>
          ))}
        </Card>
        
        <Card className="mt-4">
          <CardHeader>
            <Subtitle>Quick Actions</Subtitle>
          </CardHeader>
          
          <PrimaryButton 
            className="mb-3 flex-row items-center justify-center"
            onPress={() => navigation.navigate('EventList')}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <PrimaryButtonText className="ml-2">Manage Events</PrimaryButtonText>
          </PrimaryButton>
          
          <SecondaryButton
            className="flex-row items-center justify-center"
            onPress={() => navigation.navigate('TaskDetail', { isNewTask: true })}
          >
            <Ionicons name="add-outline" size={18} color="#0a7ea4" />
            <SecondaryButtonText className="ml-2">Create New Task</SecondaryButtonText>
          </SecondaryButton>
        </Card>
      </ScrollView>
    );
  };
  
  // Render the organizers tab
  const renderOrganizersTab = () => {
    return (
      <View>
        <SearchBar>
          <Ionicons name="search-outline" size={20} color="#666" />
          <SearchInput
            placeholder="Search organizers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-outline" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </SearchBar>
        
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <UserItem key={user.id} onPress={() => {
              setSelectedUser(user);
              setIsUserModalVisible(true);
            }}>
              <Row>
                <View className="flex-1">
                  <ListItemTitle>{user.displayName || 'No name'}</ListItemTitle>
                  <ListItemSubtitle>{user.email}</ListItemSubtitle>
                </View>
                {user.role === 'admin' ? (
                  <AdminRole>
                    <AdminRoleText>Admin</AdminRoleText>
                  </AdminRole>
                ) : (
                  <UserRole>
                    <UserRoleText>Organizer</UserRoleText>
                  </UserRole>
                )}
              </Row>
            </UserItem>
          ))
        ) : (
          <EmptyStateContainer>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <EmptyStateText>No organizers found</EmptyStateText>
          </EmptyStateContainer>
        )}
      </View>
    );
  };
  
  // Render the events tab
  const renderEventsTab = () => {
    return (
      <View>
        <PrimaryButton 
          className="mb-4 flex-row items-center justify-center"
          onPress={() => navigation.navigate('EventList')}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <PrimaryButtonText className="ml-2">Manage Events</PrimaryButtonText>
        </PrimaryButton>
        
        <EmptyStateContainer>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <EmptyStateText>Go to events management to see all events</EmptyStateText>
        </EmptyStateContainer>
      </View>
    );
  };
  
  // Render the tasks tab
  const renderTasksTab = () => {
    return (
      <View>
        <PrimaryButton 
          className="mb-4 flex-row items-center justify-center"
          onPress={() => navigation.navigate('TaskDetail', { isNewTask: true })}
        >
          <Ionicons name="add-outline" size={18} color="#fff" />
          <PrimaryButtonText className="ml-2">Create New Task</PrimaryButtonText>
        </PrimaryButton>
        
        <EmptyStateContainer>
          <Ionicons name="list-outline" size={48} color="#ccc" />
          <EmptyStateText>Task management will be available soon</EmptyStateText>
        </EmptyStateContainer>
      </View>
    );
  };
  
  // User detail modal
  const renderUserModal = () => {
    if (!selectedUser) return null;
    
    return (
      <Modal
        visible={isUserModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUserModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>{selectedUser.displayName || 'User Details'}</ModalTitle>
            
            <Label>Email</Label>
            <BodyText className="mb-3">{selectedUser.email}</BodyText>
            
            <Label>Role</Label>
            <BodyText className="mb-3">
              {selectedUser.role === 'admin' ? 'Administrator' : 'Organizer'}
            </BodyText>
            
            {selectedUser.createdAt && (
              <>
                <Label>Member Since</Label>
                <BodyText className="mb-3">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </BodyText>
              </>
            )}
            
            <ModalActions>
              <SecondaryButton
                className="flex-1"
                onPress={() => {
                  setIsUserModalVisible(false);
                  setIsRoleModalVisible(true);
                }}
              >
                <SecondaryButtonText>Change Role</SecondaryButtonText>
              </SecondaryButton>
              
              <DangerButton
                className="flex-1"
                onPress={() => {
                  setIsUserModalVisible(false);
                  setIsDeleteModalVisible(true);
                }}
              >
                <DangerButtonText>Delete</DangerButtonText>
              </DangerButton>
            </ModalActions>
            
            <OutlineButton 
              className="mt-2"
              onPress={() => setIsUserModalVisible(false)}
            >
              <OutlineButtonText>Close</OutlineButtonText>
            </OutlineButton>
          </ModalContent>
        </ModalContainer>
      </Modal>
    );
  };
  
  // Role change confirmation modal
  const renderRoleModal = () => {
    if (!selectedUser) return null;
    
    const newRole = selectedUser.role === 'admin' ? 'organizer' : 'admin';
    
    return (
      <Modal
        visible={isRoleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>Change User Role</ModalTitle>
            
            <BodyText className="mb-4">
              Are you sure you want to change the role of {selectedUser.displayName || selectedUser.email} from {selectedUser.role} to {newRole}?
            </BodyText>
            
            <ModalActions>
              <OutlineButton
                className="flex-1"
                onPress={() => setIsRoleModalVisible(false)}
              >
                <OutlineButtonText>Cancel</OutlineButtonText>
              </OutlineButton>
              
              <PrimaryButton
                className="flex-1"
                onPress={() => handleRoleChange(selectedUser.id, newRole as 'admin' | 'organizer')}
              >
                <PrimaryButtonText>Confirm</PrimaryButtonText>
              </PrimaryButton>
            </ModalActions>
          </ModalContent>
        </ModalContainer>
      </Modal>
    );
  };
  
  // Delete user confirmation modal
  const renderDeleteModal = () => {
    if (!selectedUser) return null;
    
    return (
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>Delete User</ModalTitle>
            
            <BodyText className="mb-4">
              Are you sure you want to delete {selectedUser.displayName || selectedUser.email}? This action cannot be undone.
            </BodyText>
            
            <ModalActions>
              <OutlineButton
                className="flex-1"
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <OutlineButtonText>Cancel</OutlineButtonText>
              </OutlineButton>
              
              <DangerButton
                className="flex-1"
                onPress={() => handleDeleteUser(selectedUser.id)}
              >
                <DangerButtonText>Delete</DangerButtonText>
              </DangerButton>
            </ModalActions>
          </ModalContent>
        </ModalContainer>
      </Modal>
    );
  };

  if (loading && users.length === 0) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading admin panel...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>Admin Panel</HeaderTitle>
        <HeaderSubtitle>Manage your application</HeaderSubtitle>
      </Header>
      
      <TabContainer>
        {activeTab === 'overview' ? (
          <ActiveTab>
            <ActiveTabText>Overview</ActiveTabText>
          </ActiveTab>
        ) : (
          <Tab onPress={() => setActiveTab('overview')}>
            <TabText>Overview</TabText>
          </Tab>
        )}
        
        {activeTab === 'organizers' ? (
          <ActiveTab>
            <ActiveTabText>Organizers</ActiveTabText>
          </ActiveTab>
        ) : (
          <Tab onPress={() => setActiveTab('organizers')}>
            <TabText>Organizers</TabText>
          </Tab>
        )}
        
        {activeTab === 'events' ? (
          <ActiveTab>
            <ActiveTabText>Events</ActiveTabText>
          </ActiveTab>
        ) : (
          <Tab onPress={() => setActiveTab('events')}>
            <TabText>Events</TabText>
          </Tab>
        )}
        
        {activeTab === 'tasks' ? (
          <ActiveTab>
            <ActiveTabText>Tasks</ActiveTabText>
          </ActiveTab>
        ) : (
          <Tab onPress={() => setActiveTab('tasks')}>
            <TabText>Tasks</TabText>
          </Tab>
        )}
      </TabContainer>
      
      <ScrollView className="flex-1 px-4 pb-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'organizers' && renderOrganizersTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'tasks' && renderTasksTab()}
      </ScrollView>
      
      {renderUserModal()}
      {renderRoleModal()}
      {renderDeleteModal()}
    </Container>
  );
};

export default AdminPanelScreen;