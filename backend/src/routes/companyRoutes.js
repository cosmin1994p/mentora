import express from 'express';
import * as companyController from '../controllers/companyController.js';
import * as companyRequestController from '../controllers/companyRequestController.js';
import { authenticateToken, isAdmin, isCompanyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Company Request routes
router.post('/request', authenticateToken, companyRequestController.createRequest);
router.get('/requests', authenticateToken, isAdmin, companyRequestController.getRequests);
router.put('/requests/:id', authenticateToken, isAdmin, companyRequestController.updateRequest);
router.put('/requests/:id/approve', authenticateToken, isAdmin, companyRequestController.approveRequest);
router.put('/requests/:id/reject', authenticateToken, isAdmin, companyRequestController.rejectRequest);

// Public: list company names and their package tiers (for profile company selector)
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const Company = (await import('../models/Company.js')).default;
        const companies = await Company.find({ isActive: true })
            .populate('package', 'name')
            .select('name package')
            .lean();
        res.json(companies.map(c => ({
            name: c.name,
            plan: c.package?.name || 'Free'
        })));
    } catch (error) {
        console.error('List companies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin routes (only super admin can see all companies)
router.get('/', authenticateToken, isAdmin, companyController.getAllCompanies);
router.post('/', authenticateToken, isAdmin, companyController.createCompany);

// Company-specific routes
router.get('/:id', authenticateToken, isCompanyAdmin, companyController.getCompanyDetail);
router.put('/:id', authenticateToken, isCompanyAdmin, companyController.updateCompany);

// CSV Export/Import
router.get('/:id/export-users', authenticateToken, isCompanyAdmin, companyController.exportCompanyUsers);
router.post('/:id/import-users', authenticateToken, isCompanyAdmin, companyController.importUsersCSV);

export default router;
