const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Get cluster metrics
const getClusterMetrics = async (req, res) => {
  const { awsAccessKey, awsSecretKey, awsRegion } = req.body;

  AWS.config.update({
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    region: awsRegion,
  });

  try {
    const cloudwatch = new AWS.CloudWatch();
    
    const cpuParams = {
      Namespace: 'AWS/EC2',
      MetricName: 'CPUUtilization',
      Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
      StartTime: new Date(Date.now() - 300000),
      EndTime: new Date(),
      Period: 300,
      Statistics: ['Average'],
    };

    const cpuData = await cloudwatch.getMetricStatistics(cpuParams).promise();
    const cpuUsage = cpuData.Datapoints.length > 0 ? cpuData.Datapoints[0].Average : 0;

    const memoryParams = {
      Namespace: 'System/Linux',
      MetricName: 'MemoryUtilization',
      Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
      StartTime: new Date(Date.now() - 300000),
      EndTime: new Date(),
      Period: 300,
      Statistics: ['Average'],
    };

    const memoryData = await cloudwatch.getMetricStatistics(memoryParams).promise();
    const memoryUsage = memoryData.Datapoints.length > 0 ? memoryData.Datapoints[0].Average : 0;

    const storageParams = {
      Namespace: 'System/Linux',
      MetricName: 'DiskSpaceUtilization',
      Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
      StartTime: new Date(Date.now() - 300000),
      EndTime: new Date(),
      Period: 300,
      Statistics: ['Average'],
    };

    const storageData = await cloudwatch.getMetricStatistics(storageParams).promise();
    const storageUsage = storageData.Datapoints.length > 0 ? storageData.Datapoints[0].Average : 0;

    res.status(200).json({
      cpuUsage,
      memoryUsage,
      storageUsage,
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

module.exports = {
  getClusterMetrics
};