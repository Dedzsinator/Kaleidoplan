import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, Alert } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { Task, TaskLog } from '../models/types';
import { getTaskById, getTaskLogs } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  LoadingContainer,
  Spinner,
  LoadingText,
  Header,
  HeaderTitle,
  HeaderSubtitle,
  Card,
  Title,
  BodyText
} from '../components/ui/theme';

// Styled components for the TaskLog screen
const LogEntryCard = styled(Card, 'mb-3 p-4');
const LogHeader = styled(View, 'flex-row justify-between items-center mb-2');
const LogTimestamp = styled(Text, 'text-sm text-gray-500');
const LogAction = styled(View, 'flex-row items-center');
const LogActionText = styled(Text, 'text-base font-medium ml-2');
const LogComment = styled(Text, 'text-gray-700 mt-2');
const StatusChange = styled(View, 'flex-row items-center mt-3 pt-3 border-t border-gray-100');
const OldStatus = styled(Text, 'text-sm text-gray-500');
const NewStatus = styled(Text, 'text-sm font-medium text-gray-800 ml-2');
const ArrowIcon = styled(View, 'mx-2');
const EmptyContainer = styled(View, 'flex-1 justify-center items-center p-5');
const EmptyTitle = styled(Text, 'text-lg font-bold text-gray-800 mt-4 mb-2');
const EmptyDescription = styled(Text, 'text-sm text-gray-600 text-center max-w-80');

const TaskLogScreen = ({ route, navigation }: { route: any, navigation: any }) => {
  const { taskId } = route.params;
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTaskLogs = async () => {
      try {
        setLoading(true);
        
        // Fetch task details
        const taskData = await getTaskById(taskId);
        setTask(taskData);
        
        if (taskData) {
          // Fetch task logs
          const logsData = await getTaskLogs(taskId);
          
          // Sort logs by timestamp, newest first
          const sortedLogs = logsData.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
          });
          
          setLogs(sortedLogs);
        }
      } catch (error) {
        console.error('Error fetching task logs:', error);
        Alert.alert('Error', 'Failed to load task history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskLogs();
  }, [taskId]);

  const formatTimestamp = (date: Date | string) => {
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    return format(timestamp, 'MMM d, yyyy h:mm a');
  };
  
  const getActionIcon = (action: string) => {
    switch(action) {
      case 'created':
        return <Ionicons name="add-circle-outline" size={20} color="#0a7ea4" />;
      case 'updated':
        return <Ionicons name="refresh-outline" size={20} color="#ff9500" />;
      case 'completed':
        return <Ionicons name="checkmark-circle-outline" size={20} color="#34c759" />;
      default:
        return <Ionicons name="ellipsis-horizontal" size={20} color="#8e8e93" />;
    }
  };
  
  const getActionText = (action: string) => {
    switch(action) {
      case 'created':
        return 'Task Created';
      case 'updated':
        return 'Task Updated';
      case 'completed':
        return 'Task Completed';
      default:
        return 'Task Modified';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending':
        return 'Pending';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const renderLogItem = ({ item }: { item: TaskLog }) => (
    <LogEntryCard>
      <LogHeader>
        <LogAction>
          {getActionIcon(item.action)}
          <LogActionText>{getActionText(item.action)}</LogActionText>
        </LogAction>
        <LogTimestamp>{formatTimestamp(item.timestamp)}</LogTimestamp>
      </LogHeader>
      
      {item.comment && (
        <LogComment>"{item.comment}"</LogComment>
      )}
      
      {item.oldStatus && item.newStatus && (
        <StatusChange>
          <OldStatus>{getStatusLabel(item.oldStatus)}</OldStatus>
          <ArrowIcon>
            <Ionicons name="arrow-forward" size={16} color="#8e8e93" />
          </ArrowIcon>
          <NewStatus>{getStatusLabel(item.newStatus)}</NewStatus>
        </StatusChange>
      )}
    </LogEntryCard>
  );

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading task history...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!task) {
    return (
      <Container>
        <Header>
          <HeaderTitle>Task History</HeaderTitle>
          <HeaderSubtitle>Task not found</HeaderSubtitle>
        </Header>
        
        <EmptyContainer>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <EmptyTitle>Task Not Found</EmptyTitle>
          <EmptyDescription>
            The task you're looking for could not be found or may have been deleted.
          </EmptyDescription>
        </EmptyContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>Task History</HeaderTitle>
        <HeaderSubtitle>{task.name}</HeaderSubtitle>
      </Header>
      
      {logs.length === 0 ? (
        <EmptyContainer>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <EmptyTitle>No History</EmptyTitle>
          <EmptyDescription>
            This task doesn't have any recorded history yet.
          </EmptyDescription>
        </EmptyContainer>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </Container>
  );
};

export default TaskLogScreen;