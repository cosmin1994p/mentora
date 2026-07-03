import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Trash2, Play, Eye, Edit, Plus, Search, Filter } from 'lucide-react';
import { apiService } from '../utils/api';

interface Video {
  videoId: string;
  title: string;
  type: 'course' | 'reel';
  duration: number;
  size: number;
  uploadedBy: string;
  uploadDate: string;
  views: number;
  likes: number;
  status: 'draft' | 'published' | 'archived';
  quality?: 'HD' | '4K' | 'SD';
}

export function AdminVideoManagement() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'course' | 'reel'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    type: 'course' as 'course' | 'reel',
    quality: 'HD' as 'HD' | '4K' | 'SD',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await apiService.admin.getVideos();
      setVideos((response as any) || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !uploadData.title) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('type', uploadData.type);
      formData.append('quality', uploadData.quality);
      formData.append('video', videoFile);

      await apiService.admin.uploadVideo(formData);
      setShowUploadModal(false);
      setUploadData({ title: '', type: 'course', quality: 'HD' });
      setVideoFile(null);
      fetchVideos();
      alert('✓ Video uploaded successfully!');
    } catch (error) {
      alert('Error uploading video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await apiService.admin.deleteVideo(videoId);
      setVideos(videos.filter(v => v.videoId !== videoId));
      alert('✓ Video deleted successfully!');
    } catch (error) {
      alert('Error deleting video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filter === 'all' || video.type === filter;
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5530]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-24 pb-12 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Video Management</h1>
            <p className="text-gray-400">Upload, manage, and monitor video content</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Upload Video
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" style={{ left: '16px' }} />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-4 py-3 bg-gray-800/80 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20"
              style={{ paddingLeft: '52px' }}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'course', 'reel'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-3 rounded-lg transition-all ${filter === f
                  ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded text-sm transition-all ${statusFilter === s
                  ? 'bg-[#002147] text-white'
                  : 'bg-white/5 text-gray-400'
                  }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Videos Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredVideos.map((video, index) => (
          <motion.div
            key={video.videoId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="glass-effect rounded-xl border border-white/10 overflow-hidden hover:border-[#FF5530]/30 transition-all"
          >
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-[#002147] flex items-center justify-center overflow-hidden">
              <Play className="w-12 h-12 text-white/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002147] to-transparent opacity-60"></div>
              <div className="absolute bottom-2 left-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${video.status === 'published' ? 'bg-[#FF5530]/50 text-green-200' :
                  video.status === 'draft' ? 'bg-yellow-500/50 text-yellow-200' :
                    'bg-gray-500/50 text-gray-200'
                  }`}>
                  {video.status.toUpperCase()}
                </span>
              </div>
              {video.quality && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-[#002147] rounded text-xs font-semibold">
                    {video.quality}
                  </span>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold mb-2 line-clamp-1">{video.title}</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{video.type === 'course' ? '📚 Course' : '🎬 Reel'}</span>
                  <span>{Math.round(video.duration / 60)}m</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {video.views}
                  </span>
                  <span>{(video.size / 1024 / 1024).toFixed(2)}MB</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#002147] hover:bg-[#003366] rounded text-sm transition-all">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVideo(video.videoId)}
                  className="px-3 py-2 bg-[#B54236] hover:bg-[#B54236] rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Upload Modal */}
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-[#002147]/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass-effect rounded-2xl p-8 border border-white/10 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Upload Video</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="Video title"
                  className="w-full px-4 py-3 bg-gray-800/80 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FF5530]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type *</label>
                  <select
                    value={uploadData.type}
                    onChange={(e) => setUploadData({ ...uploadData, type: e.target.value as 'course' | 'reel' })}
                    className="w-full px-4 py-3 bg-gray-800/80 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#FF5530]/50"
                  >
                    <option value="course" className="bg-gray-800">Course</option>
                    <option value="reel" className="bg-gray-800">Reel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Quality</label>
                  <select
                    value={uploadData.quality}
                    onChange={(e) => setUploadData({ ...uploadData, quality: e.target.value as 'HD' | '4K' | 'SD' })}
                    className="w-full px-4 py-3 bg-gray-800/80 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#FF5530]/50"
                  >
                    <option value="SD" className="bg-gray-800">SD</option>
                    <option value="HD" className="bg-gray-800">HD</option>
                    <option value="4K" className="bg-gray-800">4K</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Video File *</label>
                <label className="flex items-center justify-center px-4 py-6 bg-white/5 border border-white/10 border-dashed rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm">Click to select video</p>
                    {videoFile && <p className="text-xs text-[#FF5530] mt-2">✓ {videoFile.name}</p>}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleUploadVideo}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
              >
                Upload Video
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
