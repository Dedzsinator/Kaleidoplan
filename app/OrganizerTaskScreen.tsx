import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { getTasksByOrganizer, updateTaskStatus } from '../services/dataService';
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

// Custom styled components for this screen (keep your existing styled components)
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (!user || !user.id) {
          throw new Error("User not authenticated");
        }
        
        const tasksData = await getTasksByOrganizer(user.id);
        setTasks(tasksData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to load your tasks');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [user]);

  const formatDeadline = (date: Date | string) => {
    const deadlineDate = typeof date === 'string' ? new Date(date) : date;
    return format(deadlineDate, 'MMM d, yyyy');
  };
  
  const isOverdue = (deadline: Date | string, status: string) => {
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    return deadlineDate < new Date() && status !== 'completed';
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      // First update locally for instant feedback
      setTasks(currentTasks => 
        currentTasks.map(task => 
          task.taskId === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Then update in the database
      await updateTaskStatus(
        taskId, 
        newStatus, 
        user.id,
        newStatus === 'completed' ? 'Task completed' : 
        newStatus === 'in-progress' ? 'Started working on task' : ''
      );
      
      // Navigate to TaskLogScreen to show the status change was logged
      navigation.navigate('TaskLog', { taskId });
    } catch (error) {
      console.error('Error updating task status:', error);
      Alert.alert('Error', 'Failed to update task status');
      
      // Revert the optimistic update if there was an error
      setTasks(prevTasks => [...prevTasks]);
    }
  };

  // Keep your existing renderTaskItem function

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

  // Keep your loading and return code the same
};

export default OrganizerTaskScreen;