import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Toolbar,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  BarChart as BarChartIcon,
  PeopleAlt as UsersIcon,
  VideoLibrary as VideosIcon,
  Image as ImagesIcon,
  PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Course, Reel } from '../App';
import { apiService } from '../utils/api';
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminVideoManagement } from './AdminVideoManagement';

interface AdminPanelMUIProps {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  reels: Reel[];
  setReels: (reels: Reel[]) => void;
  onCreateReel: (course: Course) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function AdminPanelMUI({
  courses,
  setCourses,
  reels,
  setReels,
  onCreateReel,
}: AdminPanelMUIProps) {
  const [tabValue, setTabValue] = useState(0);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: '',
    instructor: '',
    thumbnail: '',
    duration: '',
    lessons: 0,
    category: '',
    description: '',
    rating: 5.0,
    students: 0,
    videoUrl: '',
    progress: 0,
    tags: []
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleAddCourse = async () => {
    if (!newCourse.title || !newCourse.instructor) {
      alert('Please provide both title and instructor!');
      return;
    }

    if (!videoFile) {
      alert('Please select a video for the course!');
      return;
    }

    setLoading(true);
    try {
      // Prepare FormData for API
      const formData = new FormData();
      formData.append('title', newCourse.title || '');
      formData.append('instructor', newCourse.instructor || '');
      formData.append('category', newCourse.category || '');
      formData.append('description', newCourse.description || '');
      formData.append('duration', newCourse.duration || '');
      formData.append('video', videoFile);

      // Use the courses endpoint from apiService
      const createdCourse = await apiService.request('/api/courses', {
        method: 'POST',
        body: formData,
      }) as any;

      setCourses([createdCourse, ...courses]);
      setNewCourse({
        title: '',
        instructor: '',
        thumbnail: '',
        duration: '',
        lessons: 0,
        category: '',
        description: '',
        rating: 5.0,
        students: 0,
        videoUrl: '',
        progress: 0,
        tags: []
      });
      setShowAddCourse(false);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        setCourses(courses.filter(c => c.id !== courseId));
      } catch (error) {
        console.error('Error deleting course:', error);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(135deg, #002147 0%, #002147 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Admin Control Panel
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              color: '#999',
              '&.Mui-selected': {
                color: '#FF5530',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF5530',
            },
          }}
        >
          <Tab label={`Courses (${courses.length})`} icon={<PlaylistAddIcon />} iconPosition="start" />
          <Tab label={`Reels (${reels.length})`} icon={<VideosIcon />} iconPosition="start" />
          <Tab label="Users" icon={<UsersIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<BarChartIcon />} iconPosition="start" />
        </Tabs>

        {/* Courses Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddCourse(!showAddCourse)}
              sx={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                fontWeight: 'bold',
                py: 1.5,
                alignSelf: 'flex-start',
              }}
            >
              Add New Course
            </Button>

            {/* Add Course Form */}
            {showAddCourse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Create New Course
                  </Typography>

                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Course Title"
                        value={newCourse.title}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, title: e.target.value })
                        }
                        variant="outlined"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                            },
                          },
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Instructor"
                        value={newCourse.instructor}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, instructor: e.target.value })
                        }
                        variant="outlined"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                            },
                          },
                        }}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Category"
                        value={newCourse.category}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, category: e.target.value })
                        }
                        variant="outlined"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                            },
                          },
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Duration"
                        value={newCourse.duration}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, duration: e.target.value })
                        }
                        placeholder="e.g., 10 hours"
                        variant="outlined"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                            },
                          },
                        }}
                      />
                    </Stack>

                    <TextField
                      fullWidth
                      label="Description"
                      value={newCourse.description}
                      onChange={(e) =>
                        setNewCourse({ ...newCourse, description: e.target.value })
                      }
                      multiline
                      rows={4}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                          },
                        },
                      }}
                    />

                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<UploadIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                      }}
                    >
                      Upload Video
                      <input
                        hidden
                        accept="video/*"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setVideoFile(e.target.files[0]);
                          }
                        }}
                      />
                    </Button>
                    {videoFile && (
                      <Chip
                        label={videoFile.name}
                        onDelete={() => setVideoFile(null)}
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleAddCourse}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      }}
                    >
                      Save Course
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setShowAddCourse(false)}
                      sx={{
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Paper>
              </motion.div>
            )}

            {/* Courses Grid */}
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={3}
            >
              {courses.map((course) => (
                <Box
                  key={course.id}
                  sx={{
                    flex: '1 1 calc(33.333% - 24px)',
                    minWidth: '280px',
                  }}
                >
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 8px 32px rgba(234, 126, 92, 0.2)',
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="180"
                      image={course.thumbnail}
                      alt={course.title}
                    />
                    <CardContent>
                      <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
                        {course.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#999', mb: 2 }}>
                        {course.instructor}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        {/* New Course Indicator */}
                        {(() => {
                          const isNew = new Date(course.createdAt || 0).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
                          return isNew ? <Chip label="NEW" color="secondary" size="small" /> : null;
                        })()}
                        <Chip label={course.category} size="small" />
                        <Chip
                          label={`${course.students} students`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={course.rating * 20}
                        sx={{ mb: 2 }}
                      />
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Stack>
          </Stack>
        </TabPanel>

        {/* Reels Tab */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            To create reels, go to the Courses tab and click "Create Reel" for the desired course.
          </Alert>
          <TableContainer component={Paper} sx={{ background: 'rgba(255, 255, 255, 0.05)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#FF5530' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#FF5530' }}>Creator</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#FF5530' }}>Views</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#FF5530' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reels.map((reel) => (
                  <TableRow key={reel.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <TableCell>{reel.title}</TableCell>
                    <TableCell>{reel.creator}</TableCell>
                    <TableCell>{reel.views}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            setReels(reels.filter(r => r.id !== reel.id))
                          }
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={2}>
          <AdminUserManagement />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={3}>
          <AdminAnalyticsDashboard />
        </TabPanel>
      </Container>
    </Box>
  );
}
