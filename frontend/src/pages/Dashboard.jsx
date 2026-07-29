import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Activity,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';

// =============================================
// SOCKET CONNECTION
// =============================================
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:5000';

let socket = null;

const connectSocket = () => {
  if (socket?.connected) return socket;
  
  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  });
  
  return socket;
};

// =============================================
// MAIN DASHBOARD COMPONENT
// =============================================
const Dashboard = () => {
  // State management
  const [stats, setStats] = useState({
    totalEntered: 0,
    totalExited: 0,
    currentStrength: 0,
    capacity: 15,
    densityStatus: 'Low',
    colorCode: 'green',
    activeAlerts: 0,
    lastActivity: null
  });
  
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // =============================================
  // SOCKET EVENT HANDLERS
  // =============================================
  const handleZoneUpdate = useCallback((data) => {
    console.log('Zone update received:', data);
    
    if (data.zone) {
      setStats(prev => ({
        ...prev,
        totalEntered: data.zone.totalEntered || 0,
        totalExited: data.zone.totalExited || 0,
        currentStrength: data.zone.currentOccupancy || 0,
        capacity: data.zone.capacity || 15,
        densityStatus: data.zone.densityStatus || 'Low',
        colorCode: data.zone.colorCode || 'green',
        lastActivity: data.zone.lastActivity || new Date().toISOString()
      }));
    }
    
    // Add to activity feed
    const activity = {
      id: Date.now(),
      type: data.event,
      message: data.event === 'entry' ? 'Person entered' : 'Person exited',
      timestamp: data.timestamp || new Date().toISOString(),
      deviceId: data.deviceId
    };
    
    setActivityFeed(prev => [activity, ...prev.slice(0, 9)]);
    setLastUpdate(new Date().toISOString());
  }, []);

  const handleNewAlert = useCallback((alert) => {
    console.log('New alert received:', alert);
    setAlerts(prev => [alert, ...prev.slice(0, 4)]);
    setStats(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
  }, []);

  const handleConnection = useCallback((data) => {
    console.log('Socket connected:', data);
    setConnectionStatus('connected');
    setDeviceInfo(data);
  }, []);

  // =============================================
  // SOCKET INITIALIZATION
  // =============================================
  useEffect(() => {
    const initSocket = () => {
      const socketInstance = connectSocket();
      
      // Connection events
      socketInstance.on('connect', () => {
        console.log('Connected to CrowdPulse backend');
        setConnectionStatus('connected');
      });
      
      socketInstance.on('disconnect', () => {
        console.log('Disconnected from backend');
        setConnectionStatus('disconnected');
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnectionStatus('error');
      });
      
      // Data events
      socketInstance.on('connection-established', handleConnection);
      socketInstance.on('zone-update', handleZoneUpdate);
      socketInstance.on('new-alert', handleNewAlert);
      
      socketInstance.on('alert-resolved', (alert) => {
        setAlerts(prev => prev.filter(a => a._id !== alert._id));
        setStats(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
      });
      
      socketInstance.on('system-reset', () => {
        setStats({
          totalEntered: 0,
          totalExited: 0,
          currentStrength: 0,
          capacity: 15,
          densityStatus: 'Low',
          colorCode: 'green',
          activeAlerts: 0,
          lastActivity: null
        });
        setAlerts([]);
        setActivityFeed([]);
      });
    };
    
    initSocket();
    
    // Cleanup
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('connection-established');
        socket.off('zone-update');
        socket.off('new-alert');
        socket.off('alert-resolved');
        socket.off('system-reset');
        socket.disconnect();
      }
    };
  }, [handleConnection, handleZoneUpdate, handleNewAlert]);

  // =============================================
  // DATA FETCHING
  // =============================================
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, [fetchStats, fetchAlerts]);

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================
  const getDensityColor = (status) => {
    const colors = {
      Low: 'text-green-600 bg-green-100',
      Medium: 'text-yellow-600 bg-yellow-100',
      High: 'text-orange-600 bg-orange-100',
      Critical: 'text-red-600 bg-red-100'
    };
    return colors[status] || colors.Low;
  };

  const getProgressColor = (status) => {
    const colors = {
      Low: 'bg-green-500',
      Medium: 'bg-yellow-500',
      High: 'bg-orange-500',
      Critical: 'bg-red-500'
    };
    return colors[status] || colors.Low;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const occupancyPercentage = (stats.currentStrength / stats.capacity) * 100;

  // =============================================
  // RENDER COMPONENT
  // =============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              CrowdPulse Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time crowd monitoring system
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {lastUpdate && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last update: {formatTime(lastUpdate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {(stats.densityStatus === 'High' || stats.densityStatus === 'Critical') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              stats.densityStatus === 'Critical' 
                ? 'bg-red-50 border-red-500 text-red-800' 
                : 'bg-orange-50 border-orange-500 text-orange-800'
            }`}
          >
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="font-semibold">
                {stats.densityStatus} Density Alert: {stats.currentStrength}/{stats.capacity} people
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Entered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Entered
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalEntered}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Total Exited */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Exited
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalExited}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserMinus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Current Occupancy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Currently Inside
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.currentStrength}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                of {stats.capacity} capacity
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Density Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Density Status
              </p>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getDensityColor(stats.densityStatus)}`}>
                {stats.densityStatus}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(occupancyPercentage)}% occupied
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Occupancy Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Occupancy Level
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {stats.currentStrength} / {stats.capacity} people
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
          <motion.div
            className={`h-4 rounded-full ${getProgressColor(stats.densityStatus)}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </motion.div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Activity Feed
            </h3>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {activityFeed.length > 0 ? (
                activityFeed.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className={`p-2 rounded-full ${
                      activity.type === 'entry' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.type === 'entry' ? (
                        <UserPlus className="w-4 h-4" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Alerts
            </h3>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stats.activeAlerts}
              </span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <motion.div
                    key={alert._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'Critical' 
                        ? 'bg-red-50 border-red-500 dark:bg-red-900/20' 
                        : 'bg-orange-50 border-orange-500 dark:bg-orange-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(alert.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        alert.severity === 'Critical' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active alerts</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* System Info Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>CrowdPulse v2.0.0</span>
            <span>•</span>
            <span>Professional IoT Monitoring</span>
            {deviceInfo && (
              <>
                <span>•</span>
                <span>Socket: {deviceInfo.socketId?.slice(0, 8)}...</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Last activity: {formatTime(stats.lastActivity)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;