import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:5000';

const Analytics = () => {
  const [data, setData] = useState({
    totalEntered: 0,
    totalExited: 0,
    currentOccupancy: 0,
    capacity: 15,
    densityStatus: 'Low',
    colorCode: 'green',
    totalAlerts: 0,
    resolvedAlerts: 0,
    activeAlerts: 0,
    alertResolutionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analytics`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
        setError(null);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getDensityColor = (status) => {
    const colors = {
      Low: 'text-green-600 bg-green-100',
      Medium: 'text-yellow-600 bg-yellow-100',
      High: 'text-orange-600 bg-orange-100',
      Critical: 'text-red-600 bg-red-100'
    };
    return colors[status] || colors.Low;
  };

  const occupancyPercentage = data.capacity > 0 ? Math.round((data.currentOccupancy / data.capacity) * 100) : 0;
  const throughputRate = data.totalEntered > 0 ? Math.round((data.totalExited / data.totalEntered) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800 dark:text-red-200">Error loading analytics: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive crowd monitoring insights and statistics
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Activity className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Entered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Entered</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {data.totalEntered.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time entries</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Exited</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {data.totalExited.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time exits</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Occupancy</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {data.currentOccupancy}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {occupancyPercentage}% of capacity
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Alert Resolution Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alert Resolution</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {data.alertResolutionRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.resolvedAlerts} of {data.totalAlerts} resolved
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Analysis */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Occupancy Analysis
            </h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            {/* Density Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Density
              </span>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDensityColor(data.densityStatus)}`}>
                {data.densityStatus}
              </div>
            </div>
            
            {/* Occupancy Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Occupancy Level</span>
                <span>{occupancyPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <motion.div
                  className={`h-3 rounded-full ${
                    data.densityStatus === 'Critical' ? 'bg-red-500' :
                    data.densityStatus === 'High' ? 'bg-orange-500' :
                    data.densityStatus === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            
            {/* Capacity Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.currentOccupancy}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Capacity</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {data.capacity}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Traffic Analysis */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Traffic Analysis
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            {/* Throughput Rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Throughput Rate
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {throughputRate}%
              </span>
            </div>
            
            {/* Entry/Exit Comparison */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Entries</span>
                  <span className="text-green-600 dark:text-green-400">{data.totalEntered}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Exits</span>
                  <span className="text-blue-600 dark:text-blue-400">{data.totalExited}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ 
                      width: data.totalEntered > 0 ? `${(data.totalExited / data.totalEntered) * 100}%` : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Alert Statistics */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {data.activeAlerts}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {data.resolvedAlerts}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Performance
          </h3>
          <Clock className="w-5 h-5 text-gray-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {((data.totalEntered + data.totalExited) / Math.max(1, (Date.now() - new Date().setHours(0,0,0,0)) / 3600000)).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Events/Hour</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.capacity - data.currentOccupancy}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Available Space</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.totalAlerts}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.max(0, data.totalEntered - data.totalExited)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Occupancy</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
