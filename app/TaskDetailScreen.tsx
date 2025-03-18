import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, Platform, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Ionicons } from '@expo/vector-icons';
import {Container, Card, Title, BodyText, Label, Input, TextArea, PrimaryButton, PrimaryButtonText, DangerButton, DangerButtonText, OutlineButton, OutlineButtonText, LinkText, CaptionText, Row, Spacer, LoadingContainer, Spinner, LoadingText} from '../components/ui/theme';
import { styled } from 'nativewind';

interface Task {
  taskId: string;
  name: string;
  description?: string;
  deadline: Date;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Organizer {
  id: string;
  name: string;
  email: string;
}

// Custom styled components specifically for this screen
const PickerContainer = styled(View, 'border border-gray-300 rounded-md overflow-hidden mb-4');
const DateButton = styled(OutlineButton, 'justify-between mb-4');

const TaskDetailScreen = ({route,navigation}: {route : any, navigation: any}) => {
  const { taskId, eventId, isNewTask = false } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  
  // Form state
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(new Date());
  const [taskStatus, setTaskStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        // Mock data - replace with actual API calls
        const mockOrganizers = [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
          { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
        ];
        
        setOrganizers(mockOrganizers);
        
        if (!isNewTask) {
          // Fetch existing task
          const mockTask = {
            taskId: taskId,
            name: 'Set up main stage',
            description: 'Coordinate with the stage setup team to ensure all equipment is properly installed and tested',
            deadline: new Date(2025, 5, 14),
            status: 'pending' as const,
            assignedTo: '2', // Jane Smith
            createdAt: new Date(2024, 2, 15),
            updatedAt: new Date(2024, 2, 15),
          };
          
          setTask(mockTask);
          setTaskName(mockTask.name);
          setTaskDescription(mockTask.description || '');
          setTaskDeadline(new Date(mockTask.deadline));
          setTaskStatus(mockTask.status);
          setAssignedUserId(mockTask.assignedTo);
        } else {
          // Set defaults for new task
          setAssignedUserId(mockOrganizers[0]?.id || '');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching task data:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load task details');
      }
    };
    
    fetchTaskData();
  }, [taskId, eventId, isNewTask]);

  const handleSaveTask = async () => {
    if (!taskName) {
      Alert.alert('Error', 'Task name is required');
      return;
    }
    
    if (!assignedUserId) {
      Alert.alert('Error', 'Please assign this task to an organizer');
      return;
    }
    
    try {
      setSaving(true);
      
      const taskData = {
        name: taskName,
        description: taskDescription,
        deadline: taskDeadline,
        status: taskStatus,
        assignedTo: assignedUserId,
        eventId: eventId,
      };
      
      // Replace with actual API call
      // if (isNewTask) {
      //   await createTask(taskData);
      // } else {
      //   await updateTask(taskId, taskData);
      // }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaving(false);
      Alert.alert(
        'Success', 
        `Task successfully ${isNewTask ? 'created' : 'updated'}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving task:', error);
      setSaving(false);
      Alert.alert('Error', `Failed to ${isNewTask ? 'create' : 'update'} task`);
    }
  };
  
  const handleDeleteTask = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              
              // Replace with actual API call
              // await deleteTask(taskId);
              
              // Simulate API delay
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              setSaving(false);
              Alert.alert(
                'Success', 
                'Task successfully deleted',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error deleting task:', error);
              setSaving(false);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  };
  
  const handleDateChange = (event : any, selectedDate : any) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTaskDeadline(selectedDate);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading task details...</LoadingText>
      </LoadingContainer>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isAssignedToMe = user?.id === assignedUserId;
  const canEdit = isAdmin || isAssignedToMe;

  return (
    <Container>
      <ScrollView className="flex-1">
        <Card>
          <Title className="mb-6">{isNewTask ? 'Create New Task' : 'Task Details'}</Title>
          
          <Label>Task Name</Label>
          <Input
            value={taskName}
            onChangeText={setTaskName}
            placeholder="Enter task name"
            editable={isAdmin || isNewTask}
          />
          
          <Label>Description</Label>
          <TextArea
            value={taskDescription}
            onChangeText={setTaskDescription}
            placeholder="Enter task description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={isAdmin || isNewTask}
          />
          
          <Label>Deadline</Label>
          <DateButton 
            onPress={() => setShowDatePicker(true)}
            disabled={!canEdit}
          >
            <BodyText>{format(taskDeadline, 'MMMM d, yyyy')}</BodyText>
            <Ionicons name="calendar-outline" size={20} color="#495057" />
          </DateButton>
          
          {showDatePicker && (
            <DateTimePicker
              value={taskDeadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          
          <Label>Status</Label>
          <PickerContainer>
            <Picker
              selectedValue={taskStatus}
              onValueChange={(itemValue) => setTaskStatus(itemValue)}
              enabled={canEdit}
            >
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="In Progress" value="in-progress" />
              <Picker.Item label="Completed" value="completed" />
            </Picker>
          </PickerContainer>
          
          <Label>Assigned To</Label>
          <PickerContainer>
            <Picker
              selectedValue={assignedUserId}
              onValueChange={(itemValue) => setAssignedUserId(itemValue)}
              enabled={isAdmin}
            >
              <Picker.Item label="-- Select Organizer --" value="" />
              {organizers.map(organizer => (
                <Picker.Item 
                  key={organizer.id} 
                  label={organizer.name} 
                  value={organizer.id} 
                />
              ))}
            </Picker>
          </PickerContainer>
          
          {!isNewTask && task && (
            <View className="mt-6 pt-4 border-t border-gray-200">
              <CaptionText>
                Created: {format(new Date(task.createdAt), 'MMM d, yyyy')}
              </CaptionText>
              <CaptionText className="mb-2">
                Last Updated: {format(new Date(task.updatedAt), 'MMM d, yyyy')}
              </CaptionText>
              
              {isAssignedToMe && (
                <OutlineButton
                  className="justify-start py-2"
                  onPress={() => navigation.navigate('TaskLog', { taskId: taskId })}
                >
                  <Ionicons name="list-outline" size={16} color="#0a7ea4" />
                  <LinkText className="ml-2">View Task History</LinkText>
                </OutlineButton>
              )}
            </View>
          )}
          
          <View className="flex-row justify-between mt-6 gap-3">
            {canEdit && (
              <PrimaryButton
                className="flex-1"
                onPress={handleSaveTask}
                disabled={saving}
              >
                {saving ? (
                  <Spinner size="small" color="#ffffff" />
                ) : (
                  <PrimaryButtonText>
                    {isNewTask ? 'Create Task' : 'Save Changes'}
                  </PrimaryButtonText>
                )}
              </PrimaryButton>
            )}
            
            {!isNewTask && isAdmin && (
              <DangerButton
                className="flex-1"
                onPress={handleDeleteTask}
                disabled={saving}
              >
                <DangerButtonText>Delete Task</DangerButtonText>
              </DangerButton>
            )}
          </View>
        </Card>
      </ScrollView>
    </Container>
  );
};

export default TaskDetailScreen;