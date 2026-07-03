import CompanyRequest from '../models/CompanyRequest.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

export const createRequest = async (req, res) => {
  try {
    const { companyDetails } = req.body;
    
    if (!companyDetails || !companyDetails.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const newRequest = new CompanyRequest({
      requester: req.userId,
      companyDetails
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Company request submitted successfully',
      data: newRequest
    });
  } catch (error) {
    console.error('Create company request error:', error);
    res.status(500).json({ error: 'Failed to submit company request' });
  }
};

export const getRequests = async (req, res) => {
  try {
    const requests = await CompanyRequest.find().populate('requester', 'username email fullName').sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get company requests error:', error);
    res.status(500).json({ error: 'Failed to fetch company requests' });
  }
};

export const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyDetails } = req.body;

    const updated = await CompanyRequest.findByIdAndUpdate(
      id,
      { $set: { companyDetails } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update company request error:', error);
    res.status(500).json({ error: 'Failed to update company request' });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await CompanyRequest.findById(id).populate('requester');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is already ' + request.status });
    }

    // Default package for newly approved companies
    const Package = (await import('../models/Package.js')).default;
    const defaultPackage = await Package.findOne({ name: 'Enterprise' }) || await Package.findOne();

    // Create Company
    const newCompany = new Company({
      name: request.companyDetails.name,
      email: request.companyDetails.email || request.requester.email,
      industry: request.companyDetails.industry,
      size: request.companyDetails.expectedSeats,
      website: request.companyDetails.website,
      phone: request.companyDetails.phone,
      package: defaultPackage._id,
      adminUser: request.requester._id,
      users: [request.requester._id]
    });

    await newCompany.save();

    // Update Request
    request.status = 'approved';
    await request.save();

    // Update User
    await User.findByIdAndUpdate(request.requester._id, {
      company: newCompany._id,
      companyName: newCompany.name
    });

    res.json({ success: true, message: 'Request approved and company created', data: newCompany });
  } catch (error) {
    console.error('Approve company request error:', error);
    res.status(500).json({ error: 'Failed to approve company request' });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFeedback } = req.body;

    const request = await CompanyRequest.findByIdAndUpdate(
      id,
      { status: 'rejected', adminFeedback },
      { new: true }
    );

    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json({ success: true, message: 'Request rejected', data: request });
  } catch (error) {
    console.error('Reject company request error:', error);
    res.status(500).json({ error: 'Failed to reject company request' });
  }
};
