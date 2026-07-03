import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterclass';

const sampleCourses = [
  {
    title: 'Web Development Fundamentals',
    description: 'Learn the basics of HTML, CSS, and JavaScript',
    instructor: 'John Smith',
    duration: 240,
    level: 'Beginner',
    category: 'Web Development',
    tags: ['HTML', 'CSS', 'JavaScript', 'Frontend'],
    enrollmentCount: 1500,
    completionCount: 800,
    rating: 4.8,
    reviewCount: 450,
    emotionAffinity: {
      FERICIT: 85,
      MOTIVAT: 90,
      RELAXAT: 60,
      CURIOS: 95,
      PRODUCTIV: 88,
      CREATIV: 92
    }
  },
  {
    title: 'Machine Learning Basics',
    description: 'Introduction to ML algorithms and practical applications',
    instructor: 'Jane Doe',
    duration: 360,
    level: 'Intermediate',
    category: 'Data Science',
    tags: ['Machine Learning', 'Python', 'Data Science', 'AI'],
    enrollmentCount: 2000,
    completionCount: 900,
    rating: 4.9,
    reviewCount: 520,
    emotionAffinity: {
      FERICIT: 75,
      MOTIVAT: 95,
      RELAXAT: 50,
      CURIOS: 98,
      PRODUCTIV: 92,
      CREATIV: 80
    }
  },
  {
    title: 'React Advanced Patterns',
    description: 'Master advanced React concepts and patterns',
    instructor: 'Mike Johnson',
    duration: 300,
    level: 'Advanced',
    category: 'Web Development',
    tags: ['React', 'JavaScript', 'Frontend', 'Advanced'],
    enrollmentCount: 1200,
    completionCount: 600,
    rating: 4.7,
    reviewCount: 380,
    emotionAffinity: {
      FERICIT: 80,
      MOTIVAT: 92,
      RELAXAT: 55,
      CURIOS: 94,
      PRODUCTIV: 95,
      CREATIV: 88
    }
  },
  {
    title: 'Yoga for Relaxation',
    description: 'Calm your mind and body with yoga techniques',
    instructor: 'Sarah Williams',
    duration: 120,
    level: 'Beginner',
    category: 'Wellness',
    tags: ['Yoga', 'Relaxation', 'Fitness', 'Mindfulness'],
    enrollmentCount: 1800,
    completionCount: 1200,
    rating: 4.9,
    reviewCount: 600,
    emotionAffinity: {
      FERICIT: 70,
      MOTIVAT: 60,
      RELAXAT: 98,
      CURIOS: 50,
      PRODUCTIV: 55,
      CREATIV: 65
    }
  },
  {
    title: 'Creative Writing Masterclass',
    description: 'Unlock your creative potential with professional writers',
    instructor: 'Emily Brown',
    duration: 280,
    level: 'Intermediate',
    category: 'Creative',
    tags: ['Writing', 'Creativity', 'Literature', 'Creative Writing'],
    enrollmentCount: 900,
    completionCount: 400,
    rating: 4.8,
    reviewCount: 320,
    emotionAffinity: {
      FERICIT: 88,
      MOTIVAT: 75,
      RELAXAT: 72,
      CURIOS: 90,
      PRODUCTIV: 70,
      CREATIV: 99
    }
  },
  {
    title: 'Python for Data Analysis',
    description: 'Learn Python programming for data analysis and visualization',
    instructor: 'David Lee',
    duration: 320,
    level: 'Intermediate',
    category: 'Programming',
    tags: ['Python', 'Data Analysis', 'Programming', 'Pandas'],
    enrollmentCount: 2200,
    completionCount: 1100,
    rating: 4.8,
    reviewCount: 480,
    emotionAffinity: {
      FERICIT: 75,
      MOTIVAT: 93,
      RELAXAT: 45,
      CURIOS: 96,
      PRODUCTIV: 97,
      CREATIV: 75
    }
  },
  {
    title: 'UI/UX Design Principles',
    description: 'Create beautiful and functional user interfaces',
    instructor: 'Lisa Anderson',
    duration: 240,
    level: 'Intermediate',
    category: 'Design',
    tags: ['UI', 'UX', 'Design', 'Figma'],
    enrollmentCount: 1600,
    completionCount: 700,
    rating: 4.7,
    reviewCount: 410,
    emotionAffinity: {
      FERICIT: 92,
      MOTIVAT: 85,
      RELAXAT: 75,
      CURIOS: 88,
      PRODUCTIV: 82,
      CREATIV: 98
    }
  },
  {
    title: 'Business Strategy 101',
    description: 'Learn strategic thinking and business planning',
    instructor: 'Robert Martinez',
    duration: 280,
    level: 'Intermediate',
    category: 'Business',
    tags: ['Business', 'Strategy', 'Leadership', 'Management'],
    enrollmentCount: 1400,
    completionCount: 650,
    rating: 4.6,
    reviewCount: 360,
    emotionAffinity: {
      FERICIT: 70,
      MOTIVAT: 98,
      RELAXAT: 60,
      CURIOS: 85,
      PRODUCTIV: 96,
      CREATIV: 70
    }
  },
  {
    title: 'Digital Marketing Essentials',
    description: 'Master digital marketing strategies and tactics',
    instructor: 'Jennifer Garcia',
    duration: 260,
    level: 'Beginner',
    category: 'Marketing',
    tags: ['Marketing', 'Digital', 'SEO', 'Social Media'],
    enrollmentCount: 1900,
    completionCount: 950,
    rating: 4.7,
    reviewCount: 470,
    emotionAffinity: {
      FERICIT: 85,
      MOTIVAT: 95,
      RELAXAT: 50,
      CURIOS: 80,
      PRODUCTIV: 93,
      CREATIV: 82
    }
  },
  {
    title: 'Advanced Deep Learning',
    description: 'Dive deep into neural networks and deep learning models',
    instructor: 'Prof. Alan Turing',
    duration: 400,
    level: 'Advanced',
    category: 'Data Science',
    tags: ['Deep Learning', 'TensorFlow', 'Neural Networks', 'AI'],
    enrollmentCount: 800,
    completionCount: 300,
    rating: 4.9,
    reviewCount: 250,
    emotionAffinity: {
      FERICIT: 70,
      MOTIVAT: 98,
      RELAXAT: 30,
      CURIOS: 99,
      PRODUCTIV: 98,
      CREATIV: 75
    }
  }
];

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Clearing existing courses...');
    await Course.deleteMany({});

    console.log('Inserting sample courses...');
    const result = await Course.insertMany(sampleCourses);

    console.log(`✓ Successfully seeded ${result.length} courses`);
    
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
