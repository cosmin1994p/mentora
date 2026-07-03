import Company from '../models/Company.js';
import User from '../models/User.js';
import Package from '../models/Package.js';
import { Parser } from 'json2csv';
import * as XLSX from 'xlsx';

export const getAllCompanies = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const companies = await Company.find()
      .populate('package', 'name priceMonthly')
      .populate('adminUser', 'fullName email')
      .select('name email industry size package subscription users createdAt');

    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getCompanyDetail = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user?.id;

    const company = await Company.findById(companyId)
      .populate('package')
      .populate('adminUser', 'fullName email')
      .populate('users', 'username email fullName role package');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check permission (admin or company admin)
    if (req.user?.role !== 'admin') {
      const user = await User.findById(userId);
      if (user?.company?.toString() !== companyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(company);
  } catch (error) {
    console.error('Get company detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createCompany = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, email, phone, website, industry, size, address, packageId, licenseCount } = req.body;

    if (!name || !email || !packageId) {
      return res.status(400).json({ error: 'Name, email, and package are required' });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const company = new Company({
      name,
      email,
      phone,
      website,
      industry,
      size,
      address,
      package: packageId,
      subscription: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
        licenseCount: licenseCount || 1
      }
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { companyId } = req.params;
    const updates = req.body;

    const company = await Company.findByIdAndUpdate(
      companyId,
      updates,
      { new: true }
    ).populate('package');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const exportCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format = 'csv' } = req.query;

    const company = await Company.findById(companyId)
      .populate('users', 'fullName email username role package')
      .populate('package', 'name');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Format user data
    const userData = company.users.map(user => ({
      'Full Name': user.fullName || '',
      'Email': user.email,
      'Username': user.username,
      'Role': user.role,
      'Package': company.package.name,
      'Company': company.name,
      'Created At': user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
    }));

    if (format === 'xlsx') {
      // Export to Excel
      const worksheet = XLSX.utils.json_to_sheet(userData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      res.setHeader('Content-Disposition', `attachment; filename="${company.name}-users-${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      XLSX.write(workbook, { type: 'stream', cellDates: true });
    } else {
      // Export to CSV
      const csv = new Parser().parse(userData);
      
      res.setHeader('Content-Disposition', `attachment; filename="${company.name}-users-${Date.now()}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const importUsersCSV = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { companyId } = req.params;
    const csvData = req.body; // Expecting array of user objects

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Default password that needs to be changed on first login
    const defaultPassword = 'Mentora2026!';

    const createdUsers = [];
    const errors = [];

    for (const userData of csvData) {
      try {
       const user = new User({
          fullName: userData.fullName || userData['Full Name'],
          email: userData.email,
          username: userData.email.split('@')[0],
          password: defaultPassword,
          company: companyId,
          package: company.package,
          role: 'user',
          passwordResetRequired: true,
          mfa: {
            enabled: false
          }
        });

        await user.save();

        // Add to company users array
        company.users.push(user._id);
        createdUsers.push({
          email: user.email,
          username: user.username,
          defaultPassword: defaultPassword
        });
      } catch (userError) {
        errors.push({
          email: userData.email,
          error: userError.message
        });
      }
    }

    await company.save();

    res.json({
      success: true,
      message: `${createdUsers.length} users created successfully`,
      created: createdUsers,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllCompanies,
  getCompanyDetail,
  createCompany,
  updateCompany,
  exportCompanyUsers,
  importUsersCSV
};
