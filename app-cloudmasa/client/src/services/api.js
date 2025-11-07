export const triggerDeployment = async (config) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (config.name === 'fail') {
          resolve({ status: 'failed', message: 'Deployment failed due to an error' });
        } else {
          resolve({ status: 'success', message: 'Deployment successful' });
        }
      }, 2000);
    });
  };
  