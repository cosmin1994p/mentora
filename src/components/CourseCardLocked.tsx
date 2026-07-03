import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CourseCard = ({ course, userPackage, onUpgradeClick }) => {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const hasAccess = course.isFree || course.packageTiers?.includes(userPackage);
  const isExpired = course.expirationDate && new Date() > new Date(course.expirationDate);

  const handleCourseClick = () => {
    if (!hasAccess) {
      setShowPreview(true);
      return;
    }
    
    if (isExpired) {
      return;
    }

    navigate(`/course/${course.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Preview Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden cursor-pointer group" onClick={handleCourseClick}>
        {course.thumbnail?.url ? (
          <img
            src={course.thumbnail.url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-orange-400 flex items-center justify-center">
            <span className="text-white text-4xl">🎓</span>
          </div>
        )}

        {/* Lock Icon for Locked Courses */}
        {!hasAccess && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl text-white">🔒</span>
              <p className="text-white text-sm mt-2 font-semibold">Unlock with {course.packageTiers[0]} Plan</p>
            </div>
          </div>
        )}

        {/* Expiration Badge */}
        {isExpired && (
          <div className="absolute top-2 right-2 bg-[#FF5530] text-white px-2 py-1 rounded-full text-xs font-bold">
            ⏰ Expired
          </div>
        )}

        {/* Free Badge */}
        {course.isFree && (
          <div className="absolute top-2 left-2 bg-[#FF5530] text-white px-2 py-1 rounded-full text-xs font-bold">
            FREE
          </div>
        )}

        {/* Preview Duration Badge */}
        {!hasAccess && course.previewDuration && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
            Preview: {Math.round(course.previewDuration / 60)} min
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-800 line-clamp-2 mb-2">
          {course.title}
        </h3>

        {/* Instructors */}
        {course.instructors && course.instructors.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              By <span className="font-semibold">{course.instructors.map(i => i.name).join(', ')}</span>
            </p>
          </div>
        )}

        {/* Rating & Students */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>⭐ {course.rating || 5.0}</span>
          <span>👥 {course.students || 0} students</span>
        </div>

        {/* Package Tiers Tag */}
        {!course.isFree && (
          <div className="mb-3 flex flex-wrap gap-1">
            {course.packageTiers?.map(tier => (
              <span
                key={tier}
                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  tier === 'Free' ? 'bg-green-100 text-green-700' :
                  tier === 'Starter' ? 'bg-[#002147]/20 text-[#003366]' :
                  tier === 'Growth' ? 'bg-purple-100 text-purple-700' :
                  tier === 'Enterprise' ? 'bg-[#B54236]/20 text-[#FF5530]' :
                  'bg-yellow-100 text-yellow-700'
                }`}
              >
                {tier}
              </span>
            ))}
          </div>
        )}

        {/* Duration & Lessons */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>⏱️ {course.duration || 'N/A'}</span>
          <span>📚 {course.lessonsArray?.length || 10} lessons</span>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          {hasAccess && !isExpired ? (
            <button
              onClick={handleCourseClick}
              className="w-full bg-[#002147] hover:bg-[#003366] text-white font-semibold py-2 rounded-lg transition"
            >
              Continue Learning →
            </button>
          ) : isExpired ? (
            <button disabled className="w-full bg-gray-400 text-white font-semibold py-2 rounded-lg cursor-not-allowed">
              Course Expired
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
              >
                👁️ Preview
              </button>
              <button
                onClick={onUpgradeClick}
                className="w-full bg-[#FF5530] hover:bg-[#B54236] text-white font-semibold py-2 rounded-lg transition"
              >
                🚀 {userPackage === 'Free' ? `Upgrade to ${course.packageTiers[0]}` : 'Upgrade Plan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && !hasAccess && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Preview Available</h2>
            <p className="text-gray-600 mb-4">
              This course is available in the <strong>{course.packageTiers[0]}</strong> plan and above.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-[#002147]">
                ✨ Preview: First {Math.round(course.previewDuration / 60)} minutes available
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={onUpgradeClick}
                className="flex-1 bg-[#FF5530] text-white py-2 rounded-lg hover:bg-[#B54236] font-semibold"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCard;
