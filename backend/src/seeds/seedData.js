import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import Package from '../models/Package.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

/**
 * Seed 9 Mentors/Speakers from Mentora Presentation
 * Including: Tudor Gârgu, Andrei Molesanu, Marius Mende, Virgil Silăescu, 
 * Bogdan Tudor, Dan & Marius Ștefan, Sorin Anicescu, Florin Orban, Nasrin Afshari
 */
export const seedInstructors = async () => {
  try {
    // Check if instructors already exist
    const existingCount = await Instructor.countDocuments();
    if (existingCount > 0) {
      console.log('Instructors already seeded');
      return;
    }

    const instructors = [
      {
        name: 'Tudor Gârgu',
        title: 'Creative Leadership',
        bio: 'Creative leadership expert specializing in innovative team management and creative problem-solving strategies.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/tudor-gargu-profile.jpg'
        },
        email: 'tudor.gargu@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/tudor-gargu',
          twitter: 'https://twitter.com/tudorgargu'
        },
        rating: 4.8,
        reviewCount: 156
      },
      {
        name: 'Andrei Molesanu',
        title: 'Personal Branding',
        bio: 'Personal branding strategist helping entrepreneurs and professionals build their unique value proposition.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/andrei-molesanu-profile.jpg'
        },
        email: 'andrei.molesanu@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/andrei-molesanu',
          twitter: 'https://twitter.com/andreimolesanu'
        },
        rating: 4.9,
        reviewCount: 203
      },
      {
        name: 'Marius Mende',
        title: 'Storytelling',
        bio: 'Master storyteller teaching how to craft compelling narratives that resonate with your audience.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/marius-mende-profile.jpg'
        },
        email: 'marius.mende@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/marius-mende',
          twitter: 'https://twitter.com/mariusmende'
        },
        rating: 4.7,
        reviewCount: 189
      },
      {
        name: 'Virgil Silăescu',
        title: 'Mental Resilience',
        bio: 'Expert in building mental resilience and emotional intelligence for personal and professional growth.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/virgil-silaesku-profile.jpg'
        },
        email: 'virgil.silaesku@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/virgil-silaesku',
          twitter: 'https://twitter.com/virgilsilaesku'
        },
        rating: 4.6,
        reviewCount: 142
      },
      {
        name: 'Bogdan Tudor',
        title: 'AI for Business',
        bio: 'AI and business strategy consultant helping companies leverage artificial intelligence for growth.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/bogdan-tudor-profile.jpg'
        },
        email: 'bogdan.tudor@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/bogdan-tudor',
          twitter: 'https://twitter.com/bogdantudor'
        },
        rating: 4.9,
        reviewCount: 267
      },
      {
        name: 'Dan Ștefan',
        title: 'Business Negotiation',
        bio: 'Business negotiation expert with 20+ years of experience in corporate deals and partnerships.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/dan-stefan-profile.jpg'
        },
        email: 'dan.stefan@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/dan-stefan',
          website: 'https://danstevan.business'
        },
        rating: 4.8,
        reviewCount: 198
      },
      {
        name: 'Sorin Anicescu',
        title: 'Business Strategy',
        bio: 'Strategic business consultant specializing in growth strategies and market expansion.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/sorin-anicescu-profile.jpg'
        },
        email: 'sorin.anicescu@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/sorin-anicescu',
          twitter: 'https://twitter.com/sorinarnicescu'
        },
        rating: 4.8,
        reviewCount: 212
      },
      {
        name: 'Radu Codoranu',
        title: 'Financial Education',
        bio: 'Financial expert and educator focusing on investment strategies, personal finance, and wealth creation.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/radu-codoranu-profile.jpg'
        },
        email: 'radu.codoranu@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/radu-codoranu'
        },
        rating: 4.9,
        reviewCount: 287
      },
      {
        name: 'Neroz Esfandiari',
        title: 'The World of Tomorrow',
        bio: 'Futurist and technology strategist exploring emerging trends, innovation, and the future of work.',
        profileImage: {
          url: 'https://cdn.mentora.page/file/mentora/instructors/neroz-esfandiari-profile.jpg'
        },
        email: 'neroz.esfandiari@mentora.io',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/neroz-esfandiari'
        },
        rating: 4.8,
        reviewCount: 219
      }
    ];

    const createdInstructors = await Instructor.insertMany(instructors);
    console.log(`✅ Seeded ${createdInstructors.length} instructors`);

    return createdInstructors;
  } catch (error) {
    console.error('Error seeding instructors:', error);
    throw error;
  }
};

/**
 * Seed Packages (Free, Starter, Growth, Enterprise, Elite)
 */
export const seedPackages = async () => {
  try {
    const existingCount = await Package.countDocuments();
    if (existingCount > 0) {
      console.log('Packages already seeded');
      return;
    }

    const packages = [
      {
        name: 'Free',
        order: 1,
        priceMonthly: 0,
        priceAnnual: 0,
        description: 'Get started with essential courses',
        features: [
          { name: 'Access to Free Courses', included: true },
          { name: 'Basic Analytics', included: true },
          { name: 'Community Access', included: true },
          { name: 'Premium Courses', included: false },
          { name: 'Priority Support', included: false },
          { name: 'Team Features', included: false }
        ],
        includedCourses: [], // Will be populated with free courses
        limits: {
          maxUsers: 1,
          maxTeams: 0,
          storageGB: 1,
          videoQuality: '720p'
        },
        trialDaysAvailable: 0
      },
      {
        name: 'Starter',
        order: 2,
        priceMonthly: 49,
        priceAnnual: 490,
        description: 'Perfect for individuals starting their learning journey',
        features: [
          { name: 'All Free Features', included: true },
          { name: 'Access to 50+ Courses', included: true },
          { name: 'Advanced Analytics', included: true },
          { name: 'Certificate of Completion', included: true },
          { name: 'Email Support', included: true },
          { name: 'Team Features', included: false },
          { name: '1080p Video Quality', included: false }
        ],
        limits: {
          maxUsers: 1,
          maxTeams: 0,
          storageGB: 10,
          videoQuality: '720p'
        },
        trialDaysAvailable: 14
      },
      {
        name: 'Growth',
        order: 3,
        priceMonthly: 99,
        priceAnnual: 990,
        description: 'For growing teams and professionals',
        features: [
          { name: 'All Starter Features', included: true },
          { name: 'Access to 150+ Courses', included: true },
          { name: 'Team Collaboration (5 members)', included: true },
          { name: 'Team Analytics Dashboard', included: true },
          { name: '1080p Video Quality', included: true },
          { name: 'Priority Email Support', included: true },
          { name: 'API Access', included: false },
          { name: 'Custom SSO', included: false }
        ],
        limits: {
          maxUsers: 5,
          maxTeams: 2,
          storageGB: 50,
          videoQuality: '1080p'
        },
        pricePerSeat: 19,
        trialDaysAvailable: 14
      },
      {
        name: 'Enterprise',
        order: 4,
        priceMonthly: 499,
        priceAnnual: 4990,
        description: 'For enterprises with teams',
        features: [
          { name: 'All Growth Features', included: true },
          { name: 'Access to All 500+ Courses', included: true },
          { name: 'Unlimited Team Members', included: true },
          { name: 'Advanced Team Analytics', included: true },
          { name: '4K Video Quality', included: true },
          { name: 'Phone & Email Support', included: true },
          { name: 'API Access', included: true },
          { name: 'Custom Integration Support', included: true },
          { name: 'Dedicated Account Manager', included: false },
          { name: 'Custom SSO', included: false }
        ],
        limits: {
          maxUsers: 100,
          maxTeams: 20,
          storageGB: 500,
          videoQuality: '4K'
        },
        pricePerSeat: 9,
        trialDaysAvailable: 30
      },
      {
        name: 'Elite',
        order: 5,
        priceMonthly: 999,
        priceAnnual: 9990,
        description: 'Premium enterprise solution',
        features: [
          { name: 'All Enterprise Features', included: true },
          { name: 'Unlimited Everything', included: true },
          { name: 'Custom Content Creation', included: true },
          { name: 'White Label Solution', included: true },
          { name: 'Full API Access', included: true },
          { name: '24/7 Premium Support', included: true },
          { name: 'Dedicated Account Manager', included: true },
          { name: 'Custom SSO & SAML', included: true },
          { name: 'Advanced Security Features', included: true },
          { name: 'Custom Analytics', included: true }
        ],
        limits: {
          maxUsers: 'unlimited',
          maxTeams: 'unlimited',
          storageGB: 'unlimited',
          videoQuality: '4K'
        },
        pricePerSeat: 5,
        trialDaysAvailable: 30
      }
    ];

    const createdPackages = await Package.insertMany(packages);
    console.log(`✅ Seeded ${createdPackages.length} packages`);

    return createdPackages;
  } catch (error) {
    console.error('Error seeding packages:', error);
    throw error;
  }
};

/**
 * Seed Demo Company with users
 */
export const seedCompanies = async () => {
  try {
    const existingCount = await Company.countDocuments();
    if (existingCount > 0) {
      console.log('Companies already seeded');
      return;
    }

    const growthPackage = await Package.findOne({ name: 'Growth' });

    const companies = [
      {
        name: 'Tech Innovators Inc',
        email: 'admin@techinnovators.com',
        phone: '+40 722 123 456',
        website: 'https://techinnovators.com',
        industry: 'Technology',
        size: '51-200',
        address: {
          street: 'Str. Technology 123',
          city: 'Bucharest',
          state: 'BU',
          postal: '010000',
          country: 'Romania'
        },
        package: growthPackage._id,
        subscription: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'active',
          licenseCount: 10,
          autoRenew: true
        }
      }
    ];

    const createdCompanies = await Company.insertMany(companies);
    console.log(`✅ Seeded ${createdCompanies.length} companies`);

    return createdCompanies;
  } catch (error) {
    console.error('Error seeding companies:', error);
    throw error;
  }
};

/**
 * Run all seed functions
 */
export const seedAll = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await seedPackages();
    await seedInstructors();
    await seedCompanies();
    
    console.log('✅ All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

export default { seedInstructors, seedPackages, seedCompanies, seedAll };
