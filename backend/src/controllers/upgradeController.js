import UpgradeRequest from '../models/UpgradeRequest.js';
import User from '../models/User.js';

export const submitUpgradeRequest = async (req, res) => {
  try {
    let { companyName, contactName, email, phone, desiredPackage, message } = req.body;

    // Auto-fill from user profile for quick upgrades
    if (!companyName || !contactName || !email || !phone) {
      const user = await User.findById(req.userId);
      if (user) {
        companyName = companyName || user.companyName || user.fullName || user.username || 'N/A';
        contactName = contactName || user.fullName || user.username || 'N/A';
        email = email || user.email || 'no-email@example.com';
        phone = phone || user.phone || 'N/A';
      }
    }

    if (!desiredPackage) {
      return res.status(400).json({ error: 'Please provide desired package' });
    }

    const upgradeRequest = new UpgradeRequest({
      user: req.userId,
      companyName,
      contactName,
      email,
      phone,
      desiredPackage,
      message
    });

    await upgradeRequest.save();

    res.status(201).json({
      success: true,
      message: 'Upgrade request submitted successfully',
      data: upgradeRequest
    });
  } catch (error) {
    console.error('Upgrade request error:', error);
    res.status(500).json({ error: 'Failed to submit upgrade request' });
  }
};
