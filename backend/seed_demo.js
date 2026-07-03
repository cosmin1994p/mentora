import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import b2Service from './src/services/b2Service.js';
import Course from './src/models/Course.js';
import Reel from './src/models/Reel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MEDIA_DIR = 'C:\\Users\\ghine\\Downloads\\reparat_streamclass12feb-master\\reparat_streamclass12feb-master\\Mentora Guides\\Mentora Guides\\__MACOSX\\Mentora Guides\\demo_videos_mentora';

const readMediaFile = (filename) => {
  const filePath = path.join(MEDIA_DIR, filename);
  return fs.readFileSync(filePath);
};

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Cleaning up old dummy data...');
    await Course.deleteMany({ title: { $in: ['Questlove Teaches Music Curation and DJing', 'Howard Schultz Teaches Business Leadership', 'Chris Voss Teaches the Art of Negotiation'] } });
    await Reel.deleteMany({ title: { $in: ['Malala on Creating Change', 'Judd Apatow Comedy Tips', 'Martin Scorsese Filmmaking Secrets', 'Samuel L. Jackson Acting Masterclass', 'Malcolm Gladwell Writing Tips'] } });
    console.log('Cleanup complete.');

    // Upload Course 1
    console.log('Seeding Course 1 (Music)...');
    const course1 = new Course({
      title: 'Questlove Teaches Music Curation and DJing',
      description: 'Learn the art of music curation and DJing from Questlove.',
      instructor: 'Questlove',
      category: 'music',
      duration: '4h 30m',
      lessons: 3,
      content: {
        sections: [{
          title: 'Section 1',
          lessons: [
            { title: 'Introduction', duration: 600, videoUrl: '' },
            { title: 'The Equipment', duration: 900, videoUrl: '' },
            { title: 'Building a Set', duration: 1200, videoUrl: '' }
          ]
        }]
      }
    });
    const c1VidBuffer = readMediaFile('Questlove Teaches Music Curation and DJing  Official Trailer  MasterClass - MasterClass (720p, h264).mp4');
    const c1VidData = await b2Service.uploadVideo(c1VidBuffer, course1._id);
    course1.video = c1VidData;
    course1.videoUrl = c1VidData.url;
    
    // update lesson videos with main video as a dummy
    course1.content.sections[0].lessons.forEach(l => l.videoUrl = c1VidData.url);
    
    const c1ThumbBuffer = readMediaFile('martinscorsese.jpg'); // Using available jpg
    const c1ThumbData = await b2Service.uploadThumbnail(c1ThumbBuffer, course1._id);
    course1.thumbnail = c1ThumbData;
    await course1.save();
    console.log('Course 1 saved.');

    // Upload Course 2
    console.log('Seeding Course 2 (Business)...');
    const course2 = new Course({
      title: 'Howard Schultz Teaches Business Leadership',
      description: 'Former Starbucks CEO Howard Schultz teaches you how to build a business.',
      instructor: 'Howard Schultz',
      category: 'business',
      duration: '5h 00m',
      lessons: 3,
      content: {
        sections: [{
          title: 'Section 1',
          lessons: [
            { title: 'Foundations of Leadership', duration: 720, videoUrl: '' },
            { title: 'Building a Brand', duration: 1080, videoUrl: '' },
            { title: 'Scaling Your Business', duration: 1320, videoUrl: '' }
          ]
        }]
      }
    });
    const c2VidBuffer = readMediaFile('Howard Schultz Teaches Business Leadership  Official Trailer  MasterClass - MasterClass (720p, h264).mp4');
    const c2VidData = await b2Service.uploadVideo(c2VidBuffer, course2._id);
    course2.video = c2VidData;
    course2.videoUrl = c2VidData.url;
    
    course2.content.sections[0].lessons.forEach(l => l.videoUrl = c2VidData.url);
    
    const c2ThumbBuffer = readMediaFile('mellodyhobson.jpg');
    const c2ThumbData = await b2Service.uploadThumbnail(c2ThumbBuffer, course2._id);
    course2.thumbnail = c2ThumbData;
    await course2.save();
    console.log('Course 2 saved.');

    // Upload Course 3
    console.log('Seeding Course 3 (Marketing)...');
    const course3 = new Course({
      title: 'Chris Voss Teaches the Art of Negotiation',
      description: 'Former FBI hostage negotiator Chris Voss teaches you negotiation skills.',
      instructor: 'Chris Voss',
      category: 'marketing',
      duration: '3h 45m',
      lessons: 3,
      content: {
        sections: [{
          title: 'Section 1',
          lessons: [
            { title: 'Tactical Empathy', duration: 840, videoUrl: '' },
            { title: 'Mirroring', duration: 960, videoUrl: '' },
            { title: 'Labeling', duration: 1140, videoUrl: '' }
          ]
        }]
      }
    });
    const c3VidBuffer = readMediaFile('Chris Voss Teaches the Art of Negotiation  Official Trailer  MasterClass - MasterClass (720p, h264).mp4');
    const c3VidData = await b2Service.uploadVideo(c3VidBuffer, course3._id);
    course3.video = c3VidData;
    course3.videoUrl = c3VidData.url;
    
    course3.content.sections[0].lessons.forEach(l => l.videoUrl = c3VidData.url);
    
    const c3ThumbBuffer = readMediaFile('chrisvoss.jpg');
    const c3ThumbData = await b2Service.uploadThumbnail(c3ThumbBuffer, course3._id);
    course3.thumbnail = c3ThumbData;
    await course3.save();
    console.log('Course 3 saved.');

    // Reels
    console.log('Seeding Reels...');
    const reelsData = [
      {
        title: 'Malala on Creating Change',
        creator: 'Malala Yousafzai',
        courseId: course2._id,
        vidFile: 'Malala Teaches Creating Change  Official Trailer  MasterClass - MasterClass (720p, h264).mp4',
        thumbFile: 'Malala.jpg',
        category: 'business'
      },
      {
        title: 'Judd Apatow Comedy Tips',
        creator: 'Judd Apatow',
        courseId: course3._id,
        vidFile: 'Judd Apatow Teaches Comedy  Official Trailer  MasterClass - MasterClass (720p, h264).mp4',
        thumbFile: 'JuddAptow.jpg',
        category: 'marketing'
      },
      {
        title: 'Martin Scorsese Filmmaking Secrets',
        creator: 'Martin Scorsese',
        courseId: course1._id,
        vidFile: 'Martin Scorsese Teaches Filmmaking  Official Trailer  MasterClass - MasterClass (720p, h264).mp4',
        thumbFile: 'martinscorsese.jpg',
        category: 'music'
      },
      {
        title: 'Samuel L. Jackson Acting Masterclass',
        creator: 'Samuel L. Jackson',
        courseId: course1._id,
        vidFile: 'Samuel L. Jackson Teaches Acting  Official Trailer  MasterClass - MasterClass (720p, h264).mp4',
        thumbFile: 'SamuelLJackson.jpg',
        category: 'music'
      }
    ];

    for (let i = 0; i < reelsData.length; i++) {
      const rd = reelsData[i];
      console.log(`Seeding Reel ${i + 1}...`);
      const reel = new Reel({
        title: rd.title,
        creator: rd.creator,
        course: rd.courseId,
        category: rd.category,
        duration: 30,
        isPublished: true,
        viewCount: Math.floor(Math.random() * 10000),
        likeCount: Math.floor(Math.random() * 1000)
      });
      
      const rVidBuffer = readMediaFile(rd.vidFile);
      const rVidData = await b2Service.uploadReelVideo(rVidBuffer, reel._id);
      reel.video = rVidData;
      reel.videoUrl = rVidData.url;
      
      const rThumbBuffer = readMediaFile(rd.thumbFile);
      const rThumbData = await b2Service.uploadReelThumbnail(rThumbBuffer, reel._id);
      reel.thumbnail = rThumbData;
      
      await reel.save();
      console.log(`Reel ${i + 1} saved.`);
    }

    console.log('All seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seed();
