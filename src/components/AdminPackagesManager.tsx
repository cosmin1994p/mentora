import { useState, DragEvent } from 'react';
import { Course } from '../App';
import { Sparkles, Building2, Shield, GripVertical, Inbox } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface AdminPackagesManagerProps {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

export function AdminPackagesManager({ courses, setCourses }: AdminPackagesManagerProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [modifiedCourses, setModifiedCourses] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const COLUMNS = [
    { id: 'Unassigned', label: 'Unassigned / Hidden', icon: Inbox, color: 'text-gray-400', bg: 'bg-gray-800/50', border: 'border-gray-600/50' },
    { id: 'Free', label: 'Free Plan', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { id: 'Pro', label: 'Pro Plan', icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { id: 'Enterprise', label: 'Enterprise Plan', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' }
  ];

  // Determine which column a course sits in
  const getBaseTier = (course: Course): string => {
    const tiers = course.packageTiers || [];
    if (tiers.includes('Free')) return 'Free';
    if (tiers.includes('Pro')) return 'Pro';
    if (tiers.includes('Enterprise')) return 'Enterprise';
    return 'Unassigned';
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, courseId: string) => {
    e.dataTransfer.setData('text/plain', courseId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Slight opacity effect while dragging
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetTierId: string) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData('text/plain');
    if (!courseId) return;

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const currentBaseTier = getBaseTier(course);
    if (currentBaseTier === targetTierId) return; // No change

    // Compute the new array of accessible tiers
    let newTiers: string[] = [];
    if (targetTierId === 'Free') {
      newTiers = ['Free', 'Pro', 'Enterprise'];
    } else if (targetTierId === 'Pro') {
      newTiers = ['Pro', 'Enterprise'];
    } else if (targetTierId === 'Enterprise') {
      newTiers = ['Enterprise'];
    } else {
      newTiers = []; // Unassigned
    }

    // Update local state immediately for snappy UI
    setCourses(prev => prev.map(c => 
      c.id === course.id ? { ...c, packageTiers: newTiers } : c
    ));

    setModifiedCourses(prev => {
      const newSet = new Set(prev);
      newSet.add(course.id);
      return newSet;
    });
  };

  const handleSave = async () => {
    if (modifiedCourses.size === 0) return;
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const coursesToSave = courses.filter(c => modifiedCourses.has(c.id));
      
      await Promise.all(coursesToSave.map(course => 
        fetch(`${API_BASE_URL}/courses/admin/${course.id}/packages`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ packageTiers: course.packageTiers || [] })
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update ${course.title}`);
        })
      ));
      
      setModifiedCourses(new Set());
      // SSE will broadcast updates, UI is already correct locally.
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving some changes. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-200px)] flex flex-col">
      <div className="mb-6 shrink-0 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Package Contents Manager</h2>
          <p className="text-gray-400">
            Drag and drop courses into a plan column. <br/>
            <span className="text-white font-medium">Note:</span> Courses dropped in <b>Free</b> are automatically accessible to <b>Pro</b> and <b>Enterprise</b>. 
            Courses in <b>Pro</b> are accessible to <b>Enterprise</b>.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={modifiedCourses.size === 0 || isSaving}
          className={`px-6 py-2 rounded-lg font-medium transition-all shrink-0 ml-4 ${
            modifiedCourses.size > 0 && !isSaving
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-hidden">
        {COLUMNS.map(col => {
          const Icon = col.icon;
          const columnCourses = courses.filter(c => getBaseTier(c) === col.id);
          
          return (
            <div 
              key={col.id} 
              className={`rounded-xl border ${col.border} ${col.bg} flex flex-col h-full`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0 bg-black/20">
                <div className={`p-2 rounded-lg bg-white/5 ${col.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold ${col.color}`}>{col.label}</h3>
                  <p className="text-xs text-gray-400">
                    {columnCourses.length} courses
                  </p>
                </div>
              </div>
              
              {/* Droppable Area */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {columnCourses.map(course => {
                  const isUpdating = updatingId === course.id;
                  
                  return (
                    <div
                      key={course.id}
                      draggable={!isUpdating}
                      onDragStart={(e) => handleDragStart(e, course.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#1A1D24] shadow-sm transition-all ${
                        !isUpdating ? 'cursor-grab hover:border-white/30 hover:-translate-y-0.5 active:cursor-grabbing' : 'opacity-50'
                      }`}
                    >
                      <div className="shrink-0 text-gray-500 cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      
                      {course.thumbnail ? (
                        <img 
                          src={typeof course.thumbnail === 'string' ? course.thumbnail : course.thumbnail?.url} 
                          alt="" 
                          className="w-10 h-10 rounded object-cover shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {course.instructor || 'Unknown'}
                        </p>
                      </div>
                      
                      {isUpdating && (
                        <div className="shrink-0 w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      )}
                    </div>
                  );
                })}
                
                {columnCourses.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg">
                    <p className="text-sm text-gray-500 text-center">Drag courses here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
