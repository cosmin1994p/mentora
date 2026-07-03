import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminCourseEditor from './AdminCourseEditor';

const AdminCoursesManager = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    level: 'Beginner'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await axios.post(
        '/api/courses',
        {
          title: newCourse.title,
          description: newCourse.description,
          level: newCourse.level
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setSelectedCourseId(response.data.course._id);
      setShowNewCourseForm(false);
      setNewCourse({ title: '', description: '', level: 'Beginner' });
      
      // Refresh courses
      fetchCourses();
    } catch (error) {
      console.error('Failed to create course:', error);
      alert(error.response?.data?.error || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Delete this course and all its lessons?')) return;

    try {
      await axios.delete(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCourses(courses.filter(c => c._id !== courseId));
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
      }
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    }
  };

  if (selectedCourseId) {
    return (
      <div>
        <button
          onClick={() => setSelectedCourseId(null)}
          className="mb-6 text-[#002147] hover:underline"
        >
          ← Back to Courses
        </button>
        <AdminCourseEditor courseId={selectedCourseId} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📚 Manage Courses</h1>
        <button
          onClick={() => setShowNewCourseForm(true)}
          className="bg-[#002147] text-white px-6 py-2 rounded-lg hover:bg-[#003366] font-semibold"
        >
          ➕ Create New Course
        </button>
      </div>

      {/* New Course Form */}
      {showNewCourseForm && (
        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Create New Course</h2>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Course Title *</label>
              <input
                type="text"
                required
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Creative Leadership Masterclass"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={4}
                placeholder="Course description..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Level</label>
              <select
                value={newCourse.level}
                onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newCourse.title}
                className="flex-1 bg-[#FF5530] text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {creating ? 'Creating...' : 'Create Course'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewCourseForm(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses List */}
      {loading ? (
        <div className="text-center py-12">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="bg-blue-50 p-8 rounded-lg text-center">
          <p className="text-gray-600 mb-4">No courses yet.</p>
          <button
            onClick={() => setShowNewCourseForm(true)}
            className="bg-[#002147] text-white px-6 py-2 rounded-lg hover:bg-[#003366]"
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-[#002147] to-[#FF5530] flex items-center justify-center">
                {course.thumbnail?.url ? (
                  <img
                    src={course.thumbnail.url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📚</span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold mb-2 line-clamp-2">{course.title}</h3>
                
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>Level: {course.level}</span>
                  <span>📹 {course.lessonsArray?.length || 0} lessons</span>
                </div>

                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{course.description}</p>

                {/* Package Tags */}
                {course.packageTiers && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {course.packageTiers.map((tier) => (
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

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCourseId(course._id)}
                    className="flex-1 bg-[#002147] text-white py-2 rounded-lg hover:bg-[#003366] font-semibold text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course._id)}
                    className="flex-1 bg-[#B54236] text-white py-2 rounded-lg hover:bg-[#B54236] font-semibold text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {courses.length > 0 && (
        <div className="mt-12 bg-gradient-to-r from-[#002147]/5 to-[#FF5530]/5 p-6 rounded-lg">
          <h2 className="text-lg font-bold mb-4">📊 Admin Statistics</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-[#002147]">{courses.length}</p>
              <p className="text-gray-600 text-sm">Total Courses</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-[#FF5530]">
                {courses.reduce((sum, c) => sum + (c.lessonsArray?.length || 0), 0)}
              </p>
              <p className="text-gray-600 text-sm">Total Lessons</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-[#FF5530]">
                {Math.round(courses.reduce((sum, c) => sum + (c.lessonsArray?.reduce((s, l) => s + (l.duration || 0), 0) || 0), 0) / 60)}
              </p>
              <p className="text-gray-600 text-sm">Total Minutes</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600">
                {courses.filter(c => c.lessonsArray?.length > 0).length}
              </p>
              <p className="text-gray-600 text-sm">Courses with Lessons</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoursesManager;
