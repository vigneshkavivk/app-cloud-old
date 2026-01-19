// middleware/trackActivity.js
import Register from '../models/RegisterModel.js';

export const trackUserActivity = async (req, res, next) => {
  // Only if user is authenticated and has _id
  if (req.user && req.user._id) {
    try {
      await Register.findByIdAndUpdate(
        req.user._id,
        {
          lastActive: new Date(),
          isActive: false
        },
        { new: false } // don't return doc
      );
    } catch (err) {
      console.error('Failed to update user activity:', err);
    }
  }
  next();
};
