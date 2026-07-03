import Package from '../models/Package.js';

export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true })
      .sort({ order: 1 })
      .populate('includedCourses', 'title thumbnail');

    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPackageDetail = async (req, res) => {
  try {
    const { packageId } = req.params;

    const pkg = await Package.findById(packageId)
      .populate('includedCourses', 'title description thumbnail level');

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json(pkg);
  } catch (error) {
    console.error('Get package detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, priceMonthly, priceAnnual, description, features, limits, order } = req.body;

    if (!name || priceMonthly === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const pkg = new Package({
      name,
      priceMonthly,
      priceAnnual,
      description,
      features,
      limits,
      order
    });

    await pkg.save();

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      package: pkg
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updatePackage = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { packageId } = req.params;
    const updates = req.body;

    const pkg = await Package.findByIdAndUpdate(
      packageId,
      updates,
      { new: true }
    );

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({
      success: true,
      message: 'Package updated successfully',
      package: pkg
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const addCoursesToPackage = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { packageId } = req.params;
    const { courseIds } = req.body;

    const pkg = await Package.findByIdAndUpdate(
      packageId,
      { $addToSet: { includedCourses: { $each: courseIds } } },
      { new: true }
    ).populate('includedCourses');

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({
      success: true,
      message: 'Courses added to package',
      package: pkg
    });
  } catch (error) {
    console.error('Add courses error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deletePackage = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { packageId } = req.params;

    const pkg = await Package.findByIdAndDelete(packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({
      success: true,
      message: 'Package deleted'
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: error.message });
  }
};
