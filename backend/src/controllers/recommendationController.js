import Course from '../models/Course.js';
import Recommendation from '../models/Recommendation.js';
import User from '../models/User.js';
import mlRecommendationService from '../services/mlRecommendationService.js';
import tagBasedRecommendationService from '../services/tagBasedRecommendationService.js';

export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('enrolledCourses')
      .populate('completedCourses');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let recommendations = [];
    let mlHealthy = false;

    // Try to get ML-based recommendations first
    try {
      mlHealthy = await mlRecommendationService.checkMLServiceHealth();
      if (mlHealthy) {
        const mlData = await mlRecommendationService.getEmotionBasedRecommendations(user);
        
        if (mlData.success && mlData.recommendations) {
          // Map ML recommendations to database courses
          const mlRecommendations = await Promise.all(
            mlData.recommendations.slice(0, 5).map(async (rec) => {
              const course = await Course.findOne({ title: rec.title });
              if (course) {
                return {
                  _id: course._id,
                  title: course.title,
                  description: course.description,
                  category: course.category,
                  tags: course.tags,
                  thumbnail: course.thumbnail,
                  score: rec.score,
                  source: 'ml',
                  matchFactors: rec.matchFactors,
                  explanation: rec.explanation
                };
              }
              return null;
            })
          );

          recommendations = mlRecommendations.filter(r => r !== null);
        }
      }
    } catch (error) {
      console.warn('ML API error, using fallback:', error.message);
    }

    // If ML failed or not enough recommendations, use tag-based recommendations
    if (recommendations.length < 5) {
      const emotionFallback = await tagBasedRecommendationService.getEmotionBasedRecommendationsFallback(
        user,
        10 - recommendations.length
      );
      recommendations = [
        ...recommendations,
        ...emotionFallback.map(r => ({
          ...r,
          source: 'emotion_fallback'
        }))
      ];
    }

    // Add tag-based recommendations
    const tagBased = await tagBasedRecommendationService.getTagBasedRecommendations(
      user,
      Math.max(0, 10 - recommendations.length)
    );

    recommendations = [
      ...recommendations,
      ...tagBased.map(r => ({
        ...r,
        source: 'tag_based'
      }))
    ];

    // Add popularity-based recommendations
    const popular = await tagBasedRecommendationService.getPopularityBasedRecommendations(
      user,
      Math.max(0, 10 - recommendations.length)
    );

    recommendations = [
      ...recommendations,
      ...popular.map(r => ({
        ...r,
        source: 'popularity'
      }))
    ];

    // Remove duplicates and limit to top 10
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(r => [r._id.toString(), r])).values()
    ).slice(0, 10);

    // Save recommendations to database for tracking
    for (const rec of uniqueRecommendations.slice(0, 5)) {
      const recommendation = new Recommendation({
        user: user._id,
        course: rec._id,
        emotion: user.currentEmotion,
        energyLevel: user.currentEnergyLevel,
        score: rec.score,
        source: rec.source,
        matchFactors: rec.matchFactors,
        explanation: rec.explanation
      });
      await recommendation.save();
    }

    res.json({
      success: true,
      recommendations: uniqueRecommendations,
      mlHealthy,
      userEmotion: user.currentEmotion,
      userEnergyLevel: user.currentEnergyLevel
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

export const recommendByEmotion = async (req, res) => {
  try {
    const { emotion, energyLevel = 'MEDIE' } = req.body;

    if (!emotion) {
      return res.status(400).json({ error: 'Emotion is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user emotion temporarily
    const previousEmotion = user.currentEmotion;
    const previousEnergy = user.currentEnergyLevel;
    user.currentEmotion = emotion;
    user.currentEnergyLevel = energyLevel;

    // Get ML recommendations
    const mlData = await mlRecommendationService.getEmotionBasedRecommendations(user);
    
    let recommendations = [];
    if (mlData.success && mlData.recommendations) {
      recommendations = await Promise.all(
        mlData.recommendations.slice(0, 5).map(async (rec) => {
          const course = await Course.findOne({ title: rec.title });
          return course ? {
            _id: course._id,
            title: course.title,
            description: course.description,
            emotion,
            score: rec.score,
            matchFactors: rec.matchFactors
          } : null;
        })
      );
      recommendations = recommendations.filter(r => r !== null);
    }

    // Fallback to tag-based
    if (recommendations.length < 5) {
      const fallback = await tagBasedRecommendationService.getEmotionBasedRecommendationsFallback(
        user,
        10 - recommendations.length
      );
      recommendations = [...recommendations, ...fallback];
    }

    res.json({
      success: true,
      emotion,
      recommendations: recommendations.slice(0, 10)
    });
  } catch (error) {
    console.error('Emotion recommendation error:', error);
    res.status(500).json({ error: 'Failed to get emotion-based recommendations' });
  }
};

export const recordInteraction = async (req, res) => {
  try {
    const { courseId, actionType } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Record interaction with ML service
    await mlRecommendationService.recordInteraction(
      user._id,
      courseId,
      actionType,
      user.currentEmotion
    );

    // Update user based on action
    if (actionType === 'enroll' && !user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses.push(courseId);
    } else if (actionType === 'complete') {
      if (!user.completedCourses.includes(courseId)) {
        user.completedCourses.push(courseId);
      }
      // Remove from enrolled if present
      user.enrolledCourses = user.enrolledCourses.filter(id => id.toString() !== courseId);
    }

    await user.save();

    res.json({
      success: true,
      message: `Interaction recorded: ${actionType}`
    });
  } catch (error) {
    console.error('Record interaction error:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
};

export const rateCourse = async (req, res) => {
  try {
    const { courseId, rating, emotion } = req.body;

    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add or update rating
    const existingRating = user.courseRatings.find(r => r.course.toString() === courseId);
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.emotion = emotion || user.currentEmotion;
      existingRating.timestamp = new Date();
    } else {
      user.courseRatings.push({
        course: courseId,
        rating,
        emotion: emotion || user.currentEmotion,
        timestamp: new Date()
      });
    }

    // Update course rating
    const course = await Course.findById(courseId);
    if (course) {
      const mongoose = require('mongoose');
      const allRatings = await User.aggregate([
        { $unwind: '$courseRatings' },
        { $match: { 'courseRatings.course': new mongoose.Types.ObjectId(courseId) } },
        { $group: { _id: null, avgRating: { $avg: '$courseRatings.rating' } } }
      ]);

      if (allRatings.length > 0) {
        course.rating = allRatings[0].avgRating;
        course.reviewCount = allRatings.length;
      }
      await course.save();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Rating recorded'
    });
  } catch (error) {
    console.error('Rate course error:', error);
    res.status(500).json({ error: 'Failed to rate course' });
  }
};
