import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { getTaskById, getTaskLogs } from '../services/dataService';
import { Task, TaskLog } from '../models/types';
import {
  Container,
  LoadingContainer,
  Spinner,
  LoadingText
} from '../components/ui/theme';

// Keep your custom styled components

const TaskLogScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaskLogs = async () => {
      try {
        const [taskData, logsData] = await Promise.all([
          getTaskById(taskId),
          getTaskLogs(taskId)
        ]);
        
        setTask(taskData);
        setLogs(logsData);
      } catch (error) {
        console.error('Error fetching task logs:', error);
        Alert.alert('Error', 'Failed to load task history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskLogs();
  }, [taskId]);

  // Keep your existing formatting and rendering functions
};

export default TaskLogScreen;