import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PackageUpgradeModal = ({ isOpen, onClose, currentPackage, onUpgradeSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/packages');
      const filtered = response.data.filter(p => p.name !== currentPackage);
      setPackages(filtered);
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (pkg) => {
    setProcessingPayment(true);
    try {
      // In real app, integrate with Stripe/PayPal here
      const response = await axios.post(`/api/packages/${pkg._id}/upgrade`, {
        billingCycle: 'monthly'
      });

      if (response.data.success) {
        onUpgradeSuccess(pkg);
        onClose();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert(error.response?.data?.error || 'Upgrade failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-orange-500 p-6 flex justify-between items-center text-white">
          <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:opacity-80"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">Loading packages...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg._id}
                  className="border rounded-lg p-6 hover:shadow-lg transition-shadow hover:border-[#FF5530] cursor-pointer"
                  onClick={() => setSelectedPackage(pkg._id)}
                >
                  {/* Package name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

                  {/* Pricing */}
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-[#FF5530]">€{pkg.priceMonthly}</span>
                    <span className="text-gray-600 ml-2">/month</span>
                    {pkg.priceAnnual && (
                      <div className="text-sm text-gray-600">
                        or €{pkg.priceAnnual}/year (save {Math.round((1 - pkg.priceAnnual / (pkg.priceMonthly * 12)) * 100)}%)
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-6 space-y-2">
                    {pkg.features?.slice(0, 4).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={feature.included ? '✅' : '❌'} />
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                    {pkg.features?.length > 4 && (
                      <p className="text-xs text-gray-500 mt-2">+{pkg.features.length - 4} more features</p>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => setSelectedPackage(pkg._id)}
                    className={`w-full py-2 rounded-lg font-semibold transition ${
                      selectedPackage === pkg._id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {selectedPackage === pkg._id ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade Button */}
          {selectedPackage && (
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const pkg = packages.find(p => p._id === selectedPackage);
                  handleUpgrade(pkg);
                }}
                disabled={processingPayment}
                className="px-6 py-2 bg-[#FF5530] text-white rounded-lg font-semibold hover:bg-[#B54236] disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageUpgradeModal;
