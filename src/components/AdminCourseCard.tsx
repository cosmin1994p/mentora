import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Users, Edit, Film, Trash2, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { apiService } from '../utils/api';
import { Course } from '../App';

interface EnrolledUser {
    id: string;
    name: string;
    email: string;
    lastLogin: string | null;
    completed: boolean;
    enrolledCount: number;
}

interface AdminCourseCardProps {
    course: Course;
    onEdit: (course: Course) => void | Promise<void>;
    onCreateReel: (course: Course) => void;
    onDelete: (courseId: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function AdminCourseCard({ course, onEdit, onCreateReel, onDelete, isExpanded: externalExpanded, onToggleExpand }: AdminCourseCardProps) {
    // Use external state if provided, otherwise use internal state
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

    const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load enrolled users when expanded (from external or internal trigger)
    useEffect(() => {
        if (isExpanded && !loaded) {
            loadEnrolledUsers();
        }
    }, [isExpanded, loaded]);

    const loadEnrolledUsers = async () => {
        // Skip for optimistic/temporary courses
        if (course.id.startsWith('temp-')) {
            setLoaded(true);
            return;
        }

        setLoading(true);
        try {
            const response = await apiService.admin.getCourseEnrolledUsers(course.id);
            setEnrolledUsers((response as any)?.users || []);
            setLoaded(true);
        } catch (error) {
            console.error('Failed to fetch enrolled users:', error);
            setEnrolledUsers([]);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setInternalExpanded(!internalExpanded);
        }
    };

    const completedCount = enrolledUsers.filter(u => u.completed).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect rounded-xl overflow-hidden border border-white/10 flex flex-col h-full"
        >
            {/* Thumbnail - Fixed 16:9 aspect ratio */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 glass-effect rounded text-xs">
                    {course.category}
                </div>
            </div>

            {/* Course Info */}
            <div className="p-3 flex-1">
                <h4 className="font-semibold text-sm line-clamp-1 mb-1">{course.title}</h4>
                <p className="text-xs text-gray-400 mb-2">{course.instructor}</p>

                {/* Stats Row */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{course.lessons}</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400">
                        <Users className="w-3 h-3" />
                        <span>{course.students}</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons - Below */}
            <div className="flex gap-2 p-3 pt-0">
                <button
                    onClick={async () => {
                        const result = onEdit(course);
                        if (result instanceof Promise) {
                            await result;
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-all text-xs"
                >
                    <Edit className="w-3 h-3" />
                    Edit
                </button>
                <button
                    onClick={() => onCreateReel(course)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#002147] hover:bg-[#003366] rounded-lg transition-all text-xs"
                >
                    <Film className="w-3 h-3" />
                    Reel
                </button>
                <button
                    onClick={() => onDelete(course.id)}
                    className="flex items-center justify-center px-2 py-1.5 bg-[#FF5530] hover:bg-[#ff6d4d] rounded-lg transition-all"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {/* Expand Toggle */}
            <button
                onClick={toggleExpand}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 transition-all text-xs text-gray-400"
            >
                <Users className="w-4 h-4" />
                <span>
                    {loaded ? `${enrolledUsers.length} Enrolled Users` : 'View Enrolled Users'}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expanded Users Section */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-white/10 bg-white/5">
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF5530]"></div>
                                </div>
                            ) : enrolledUsers.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">
                                    No users enrolled in this course yet.
                                </p>
                            ) : (
                                <>
                                    {/* Stats Summary */}
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 rounded-lg">
                                            <Users className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm text-blue-400">{enrolledUsers.length} Enrolled</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#FF5530]/20 rounded-lg">
                                            <CheckCircle className="w-4 h-4 text-[#FF5530]" />
                                            <span className="text-sm text-[#FF5530]">{completedCount} Completed</span>
                                        </div>
                                    </div>

                                    {/* Users List */}
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {enrolledUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar */}
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${user.completed
                                                        ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                                        : 'bg-gradient-to-br from-[#003366] to-[#6b5294]'
                                                        }`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm flex items-center gap-2">
                                                            {user.name}
                                                            {user.completed && (
                                                                <CheckCircle className="w-4 h-4 text-[#FF5530]" />
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xs px-2 py-1 rounded-full ${user.completed
                                                        ? 'bg-[#FF5530]/20 text-[#FF5530]'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {user.completed ? 'Completed' : 'In Progress'}
                                                    </p>
                                                    {user.lastLogin && (
                                                        <p className="text-xs text-gray-500 mt-1">Last: {user.lastLogin}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
