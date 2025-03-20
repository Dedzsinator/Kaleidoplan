import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
// Remove MongoDB-related imports
// import { getTasksByOrganizer, updateTaskStatus } from '../services/dataService';
import { Task } from '../models/types';
import {
  Container,
  Header,
  HeaderTitle,
  HeaderSubtitle,
  PrimaryButton,
  PrimaryButtonText,
  OutlineButton,
  OutlineButtonText,
  Card,
  LoadingContainer,
  Spinner,
  LoadingText,
  Badge,
  BadgeText
} from '../components/ui/theme';

// Custom styled components for this screen
const TaskCard = styled(Card, 'p-4 mb-3');
const TaskHeader = styled(View, 'flex-row justify-between items-center mb-2');
const TaskName = styled(Text, 'text-base font-semibold text-gray-800 flex-1');
const TaskEventName = styled(Text, 'text-sm text-gray-600 mb-1');
const TaskDeadline = styled(Text, 'text-sm text-gray-600 mb-3');
const OverdueText = styled(Text, 'text-danger font-medium');
const ActionButtons = styled(View, 'flex-row justify-between mt-2');
const SectionTitle = styled(Text, 'text-lg font-bold mt-5 mb-3 text-gray-800');
const EmptyText = styled(Text, 'text-sm text-gray-500 italic mb-4');
const EmptyContainer = styled(View, 'flex-1 justify-center items-center p-5');
const EmptyTitle = styled(Text, 'text-lg font-bold text-gray-800 mt-4 mb-2');
const EmptyDescription = styled(Text, 'text-sm text-gray-600 text-center max-w-80');

// Status badge components
const PendingBadge = styled(Badge, 'bg-warning-light');
const PendingBadgeText = styled(BadgeText, 'text-warning');
const InProgressBadge = styled(Badge, 'bg-info-light');
const InProgressBadgeText = styled(BadgeText, 'text-info');
const CompletedBadge = styled(Badge, 'bg-success-light');
const CompletedBadgeText = styled(BadgeText, 'text-success');

const OrganizerTaskScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Mock data instead of MongoDB call
        const mockTasks = [
          {
            taskId: '1',
            name: 'Set up main stage',
            description: 'Coordinate with the stage setup team',
            deadline: new Date(2025, 5, 14),
            status: 'pending',
            assignedTo: user?.id || '',
            eventId: '1',
            eventName: 'Summer Music Festival',
            createdAt: new Date(2024, 2, 15),
            updatedAt: new Date(2024, 2, 15)
          },
          {
            taskId: '2',
            name: 'Coordinate food vendors',
            description: 'Contact all food vendors',
            deadline: new Date(2025, 5, 10),
            status: 'in-progress',
            assignedTo: user?.id || '',
            eventId: '1',
            eventName: 'Summer Music Festival',
            createdAt: new Date(2024, 2, 15),
            updatedAt: new Date(2024, 2, 18)
          },
          {
            taskId: '3',
            name: 'Speaker registration',
            description: 'Manage speaker registration',
            deadline: new Date(2025, 3, 5),
            status: 'completed',
            assignedTo: user?.id || '',
            eventId: '2',
            eventName: 'Tech Conference 2025',
            createdAt: new Date(2024, 2, 15),
            updatedAt: new Date(2024, 2, 20)
          }
        ];
        
        setTasks(mockTasks);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to load your tasks');
        setLoading(false);
      }
    };
    
    setLoading(true);
    fetchTasks();
  }, [user]);

  const formatDeadline = (date) => {
    const deadlineDate = typeof date === 'string' ? new Date(date) : date;
    return format(deadlineDate, 'MMM d, yyyy');
  };
  
  const isOverdue = (deadline, status) => {
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    return deadlineDate < new Date() && status !== 'completed';
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Update locally for instant feedback
      setTasks(currentTasks => 
        currentTasks.map(task => 
          task.taskId === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Mock API call instead of MongoDB
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to TaskLogScreen to show the status change was logged
      navigation.navigate('TaskLog', { taskId });
    } catch (error) {
      console.error('Error updating task status:', error);
      Alert.alert('Error', 'Failed to update task status');
      
      // Revert the optimistic update if there was an error
      setTasks(prevTasks => [...prevTasks]);
    }
  };

  const renderTaskItem = ({ item }) => (
    <TaskCard>
      <TaskHeader>
        <TaskName>{item.name}</TaskName>
        {item.status === 'pending' ? (
          <PendingBadge>
            <PendingBadgeText>Pending</PendingBadgeText>
          </PendingBadge>
        ) : item.status === 'in-progress' ? (
          <InProgressBadge>
            <InProgressBadgeText>In Progress</InProgressBadgeText>
          </InProgressBadge>
        ) : (
          <CompletedBadge>
            <CompletedBadgeText>Completed</CompletedBadgeText>
          </CompletedBadge>
        )}
      </TaskHeader>
      
      <TaskEventName>
        <Ionicons name="calendar-outline" size={14} color="#666" /> {item.eventName}
      </TaskEventName>
      
      <TaskDeadline>
        <Ionicons name="time-outline" size={14} color="#666" /> Deadline: {formatDeadline(item.deadline)}
        {isOverdue(item.deadline, item.status) && (
          <OverdueText> (Overdue)</OverdueText>
        )}
      </TaskDeadline>
      
      {item.status !== 'completed' && (
        <ActionButtons>
          {item.status === 'pending' ? (
            <PrimaryButton
              className="flex-1 mr-2"
              onPress={() => handleStatusChange(item.taskId, 'in-progress')}
            >
              <PrimaryButtonText>Start Task</PrimaryButtonText>
            </PrimaryButton>
          ) : (
            <PrimaryButton
              className="flex-1 mr-2"
              onPress={() => handleStatusChange(item.taskId, 'completed')}
            >
              <PrimaryButtonText>Complete Task</PrimaryButtonText>
            </PrimaryButton>
          )}
          
          <OutlineButton
            className="flex-1 ml-2"
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.taskId })}
          >
            <OutlineButtonText>Details</OutlineButtonText>
          </OutlineButton>
        </ActionButtons>
      )}
      
      {item.status === 'completed' && (
        <OutlineButton
          onPress={() => navigation.navigate('TaskDetail', { taskId: item.taskId })}
        >
          <OutlineButtonText>View Details</OutlineButtonText>
        </OutlineButton>
      )}
    </TaskCard>
  );

  const renderTasksByStatus = () => {
    const pending = tasks.filter(task => task.status === 'pending');
    const inProgress = tasks.filter(task => task.status === 'in-progress');
    const completed = tasks.filter(task => task.status === 'completed');
    
    return (
      <>
        <SectionTitle>In Progress ({inProgress.length})</SectionTitle>
        {inProgress.length > 0 ? (
          inProgress.map(task => renderTaskItem({ item: task }))
        ) : (
          <EmptyText>No tasks in progress</EmptyText>
        )}
        
        <SectionTitle>Pending ({pending.length})</SectionTitle>
        {pending.length > 0 ? (
          pending.map(task => renderTaskItem({ item: task }))
        ) : (
          <EmptyText>No pending tasks</EmptyText>
        )}
        
        <SectionTitle>Completed ({completed.length})</SectionTitle>
        {completed.length > 0 ? (
          completed.map(task => renderTaskItem({ item: task }))
        ) : (
          <EmptyText>No completed tasks</EmptyText>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading your tasks...</LoadingText>
      </LoadingContainer>
    );
  }

  if (tasks.length === 0) {
    return (
      <Container>
        <Header>
          <HeaderTitle>My Tasks</HeaderTitle>
          <HeaderSubtitle>Tasks assigned to you</HeaderSubtitle>
        </Header>
        
        <EmptyContainer>
          <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
          <EmptyTitle>No Tasks Assigned</EmptyTitle>
          <EmptyDescription>
            You don't have any tasks assigned to you yet. Check back later.
          </EmptyDescription>
        </EmptyContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>My Tasks</HeaderTitle>
        <HeaderSubtitle>Tasks assigned to you</HeaderSubtitle>
      </Header>
      
      <FlatList
        data={[]} // Empty data as we're using manual rendering
        renderItem={() => null}
        ListHeaderComponent={renderTasksByStatus}
        contentContainerStyle={{ padding: 16 }}
      />
    </Container>
  );
};

export default OrganizerTaskScreen;