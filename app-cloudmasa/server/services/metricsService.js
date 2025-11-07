// server/services/metricsService.js
import AWS from 'aws-sdk';
import logger from '../utils/logger.js';

// Get CloudWatch metrics
const getCloudWatchMetrics = async (awsConfig, metricParams) => {
  try {
    AWS.config.update({
      accessKeyId: awsConfig.accessKey,
      secretAccessKey: awsConfig.secretKey,
      region: awsConfig.region
    });

    const cloudwatch = new AWS.CloudWatch();
    return await cloudwatch.getMetricStatistics(metricParams).promise();
  } catch (error) {
    logger.error('Error fetching CloudWatch metrics:', error);
    throw new Error(`CloudWatch Error: ${error.message}`);
  }
};

// Get CPU utilization
const getCpuUtilization = async (awsConfig, instanceId) => {
  const params = {
    Namespace: 'AWS/EC2',
    MetricName: 'CPUUtilization',
    Dimensions: [{ Name: 'InstanceId', Value: instanceId || 'YOUR_INSTANCE_ID' }],
    StartTime: new Date(Date.now() - 300000),
    EndTime: new Date(),
    Period: 300,
    Statistics: ['Average'],
  };

  const data = await getCloudWatchMetrics(awsConfig, params);
  return data.Datapoints.length > 0 ? data.Datapoints[0].Average : 0;
};

// Get memory utilization
const getMemoryUtilization = async (awsConfig, instanceId) => {
  const params = {
    Namespace: 'System/Linux',
    MetricName: 'MemoryUtilization',
    Dimensions: [{ Name: 'InstanceId', Value: instanceId || 'YOUR_INSTANCE_ID' }],
    StartTime: new Date(Date.now() - 300000),
    EndTime: new Date(),
    Period: 300,
    Statistics: ['Average'],
  };

  const data = await getCloudWatchMetrics(awsConfig, params);
  return data.Datapoints.length > 0 ? data.Datapoints[0].Average : 0;
};

// Get disk space utilization
const getDiskUtilization = async (awsConfig, instanceId) => {
  const params = {
    Namespace: 'System/Linux',
    MetricName: 'DiskSpaceUtilization',
    Dimensions: [{ Name: 'InstanceId', Value: instanceId || 'YOUR_INSTANCE_ID' }],
    StartTime: new Date(Date.now() - 300000),
    EndTime: new Date(),
    Period: 300,
    Statistics: ['Average'],
  };

  const data = await getCloudWatchMetrics(awsConfig, params);
  return data.Datapoints.length > 0 ? data.Datapoints[0].Average : 0;
};

export {
  getCloudWatchMetrics,
  getCpuUtilization,
  getMemoryUtilization,
  getDiskUtilization
};