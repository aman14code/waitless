'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Stethoscope, LogOut, Users, CheckCircle, Circle, X, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      router.push('/login');
    }
  }, [router]);

  // Fetch doctors and set default selection
  useEffect(() => {
    if (!user) return;

    const fetchDoctors = async () => {
      try {
        const response = await api.get('/api/doctors');
        const doctorsData = response.data;
        setDoctors(doctorsData);
        
        // Select first doctor by default
        if (doctorsData.length > 0) {
          setSelectedDoctor(doctorsData[0]);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        toast.error('Failed to load doctors');
      }
    };

    fetchDoctors();
  }, [user]);

  // Fetch queue and stats when doctor changes
  useEffect(() => {
    if (!selectedDoctor) return;

    const fetchQueue = async () => {
      try {
        const response = await api.get(`/api/tokens/queue/${selectedDoctor.id}`);
        const queueData = response.data;
        setQueue(queueData);

        // Calculate stats
        const waiting = queueData.filter(t => t.status === 'waiting').length;
        const completed = queueData.filter(t => t.status === 'completed').length;
        const total = queueData.length;

        setStats({ waiting, completed, total });
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };

    fetchQueue();
  }, [selectedDoctor]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!selectedDoctor) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL);
    
    socket.on('queue-updated', (data) => {
      if (data.doctorId === selectedDoctor.id) {
        // Refetch queue when it updates
        api.get(`/api/tokens/queue/${selectedDoctor.id}`)
          .then(response => {
            const queueData = response.data;
            setQueue(queueData);

            // Update stats
            const waiting = queueData.filter(t => t.status === 'waiting').length;
            const completed = queueData.filter(t => t.status === 'completed').length;
            const total = queueData.length;

            setStats({ waiting, completed, total });
          })
          .catch(error => console.error('Error refreshing queue:', error));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedDoctor]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleCallNext = async () => {
    if (!selectedDoctor) return;

    setCallingNext(true);
    try {
      const response = await api.post('/api/tokens/call-next', { doctorId: selectedDoctor.id });
      toast.success('Next patient called successfully!');
      
      // The queue will be updated automatically via Socket.io
    } catch (error) {
      if (error.response?.data?.message === 'No more patients') {
        toast.success('No more patients in queue!');
      } else {
        toast.error(error.response?.data?.error || 'Failed to call next patient');
      }
    } finally {
      setCallingNext(false);
    }
  };

  const handleSkipToken = async (tokenId) => {
    try {
      await api.post(`/api/tokens/skip/${tokenId}`);
      toast.success('Patient skipped successfully!');
      
      // The queue will be updated automatically via Socket.io
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to skip patient');
    }
  };

  const currentlySeeing = queue.find(t => t.status === 'called');
  const waitingQueue = queue.filter(t => t.status === 'waiting').sort((a, b) => a.tokenNumber - b.tokenNumber);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Doctor Panel</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Doctor Selection */}
        {doctors.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor Profile</label>
            <div className="relative">
              <select
                value={selectedDoctor?.id || ''}
                onChange={(e) => {
                  const doctor = doctors.find(d => d.id === e.target.value);
                  setSelectedDoctor(doctor);
                }}
                className="w-full md:w-64 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Waiting</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.waiting}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Today</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Circle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Currently Seeing */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Seeing</h2>
            {currentlySeeing ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium mb-2">Now Serving</p>
                  <p className="text-4xl font-bold text-green-700 mb-2">#{currentlySeeing.tokenNumber}</p>
                  <p className="text-lg text-gray-900 font-semibold">{currentlySeeing.patient.name}</p>
                  <p className="text-gray-600">{currentlySeeing.patient.phone}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-500">No patient currently being seen</p>
              </div>
            )}

            {/* Call Next Button */}
            <button
              onClick={handleCallNext}
              disabled={callingNext || waitingQueue.length === 0}
              className="w-full mt-4 bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {callingNext ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : waitingQueue.length === 0 ? (
                'No More Patients'
              ) : (
                'Call Next Patient'
              )}
            </button>
          </div>

          {/* Waiting Queue */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Waiting Queue ({waitingQueue.length})
            </h2>
            
            {waitingQueue.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">No patients waiting</p>
                <p className="text-gray-400">All patients have been seen! </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {waitingQueue.map(token => (
                    <div key={token.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">#{token.tokenNumber}</p>
                        <p className="text-gray-900">{token.patient.name}</p>
                        <p className="text-sm text-gray-500">{token.patient.phone}</p>
                      </div>
                      <button
                        onClick={() => handleSkipToken(token.id)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Skip patient"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
