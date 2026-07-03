import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { apiService } from '../utils/api';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
}

export function UpgradeModal({ isOpen, onClose, courseTitle }: UpgradeModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    desiredPackage: 'Growth', // Default
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill form data from user profile if available
  useEffect(() => {
    if (isOpen) {
      try {
        const savedProfileStr = localStorage.getItem('userProfile');
        if (savedProfileStr) {
          const savedProfile = JSON.parse(savedProfileStr);
          setFormData(prev => ({
            ...prev,
            contactName: savedProfile.fullName || savedProfile.username || prev.contactName,
            email: savedProfile.email || prev.email,
            companyName: savedProfile.company || prev.companyName,
            phone: savedProfile.phone || prev.phone
          }));
        }
      } catch (e) {
        console.error("Failed to parse user profile", e);
      }
    }
  }, [isOpen]);

  const packages = [
    { name: 'Starter', price: '€9.99/mo', users: 'Up to 50 users', desc: 'Good for individuals starting out' },
    { name: 'Growth', price: '€29.99/mo', users: 'Up to 200 users', desc: 'Perfect for professionals' },
    { name: 'Enterprise', price: 'Custom', users: 'Unlimited users', desc: 'Full access for teams' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiService.request('/upgrade-requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response) {
        setStep(2);
      }
    } catch (error) {
      console.error('Upgrade request failed:', error);
      toast.error('An error occurred while sending the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        desiredPackage: 'Growth',
        message: ''
      });
    }, 300); // Reset after closing animation
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Background Overlay */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-[#001229] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative h-48 bg-gradient-to-br from-[#002147] to-[#001229] flex flex-col items-center justify-center border-b border-white/10 shrink-0">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Upgrade Required</h2>
              <p className="text-white/70 text-center px-6">
                {courseTitle ? (
                  <>The course <strong>{courseTitle}</strong> requires a higher package tier.</>
                ) : (
                  "This content is exclusive to higher package tiers."
                )}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">Company Name *</label>
                          <input
                            required
                            type="text"
                            value={formData.companyName}
                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                            className="w-full bg-[#001a33] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="Your Company LLC"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">Contact Name *</label>
                          <input
                            required
                            type="text"
                            value={formData.contactName}
                            onChange={e => setFormData({...formData, contactName: e.target.value})}
                            className="w-full bg-[#001a33] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">Email *</label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-[#001a33] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="john@company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1">Phone *</label>
                          <input
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-[#001a33] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">Select Desired Package *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {packages.map((pkg) => (
                            <div
                              key={pkg.name}
                              onClick={() => setFormData({...formData, desiredPackage: pkg.name})}
                              className={`cursor-pointer border rounded-xl p-4 transition-all ${
                                formData.desiredPackage === pkg.name 
                                  ? 'bg-orange-500/10 border-orange-500' 
                                  : 'bg-[#001a33] border-white/10 hover:border-white/30'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-white">{pkg.name}</span>
                                <span className="text-xs font-medium text-orange-400">{pkg.price}</span>
                              </div>
                              <p className="text-xs text-white/50">{pkg.users}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-[#ff4400] hover:from-orange-600 hover:to-[#e63d00] text-white rounded-xl py-3.5 font-medium transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        {isSubmitting ? 'Sending...' : 'Request Upgrade'}
                        {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Request Sent!</h3>
                    <p className="text-white/70 max-w-sm mb-8">
                      Your request has been successfully sent! Our Admin team will notify your company shortly regarding the upgrade to the <strong>{formData.desiredPackage}</strong> package.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                    >
                      Close Window
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
