'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Activity, LogOut, Users, Clock, TrendingUp, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorQueues, setDoctorQueues] = useState({});
  const [stats, setStats] = useState({
    totalPatients: 0,
    waitingNow: 0,
    completed: 0,
    activeDoctors: 0
  });
  const [loading, setLoading] = useState(true);
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

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch doctors
        const doctorsResponse = await api.get('/api/doctors');
        const doctorsData = doctorsResponse.data;
        setDoctors(doctorsData);

        // Fetch queue data for each doctor
        const queuePromises = doctorsData.map(async (doctor) => {
          try {
            const queueResponse = await api.get(`/api/tokens/queue/${doctor.id}`);
            return { doctorId: doctor.id, queue: queueResponse.data };
          } catch (error) {
            console.error(`Error fetching queue for doctor ${doctor.id}:`, error);
            return { doctorId: doctor.id, queue: [] };
          }
        });

        const queueResults = await Promise.all(queuePromises);
        const queuesMap = {};
        queueResults.forEach(result => {
          queuesMap[result.doctorId] = result.queue;
        });
        setDoctorQueues(queuesMap);

        // Calculate stats
        let totalPatients = 0;
        let waitingNow = 0;
        let completed = 0;
        let activeDoctors = 0;

        doctorsData.forEach(doctor => {
          const queue = queuesMap[doctor.id] || [];
          const waiting = queue.filter(t => t.status === 'waiting').length;
          const completedToday = queue.filter(t => t.status === 'completed').length;
          
          totalPatients += queue.length;
          waitingNow += waiting;
          completed += completedToday;
          
          if (waiting > 0 || queue.some(t => t.status === 'called')) {
            activeDoctors++;
          }
        });

        setStats({ totalPatients, waitingNow, completed, activeDoctors });
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL);
    
    socket.on('queue-updated', async () => {
      // Refetch all data when any queue updates
      try {
        const doctorsResponse = await api.get('/api/doctors');
        const doctorsData = doctorsResponse.data;

        const queuePromises = doctorsData.map(async (doctor) => {
          try {
            const queueResponse = await api.get(`/api/tokens/queue/${doctor.id}`);
            return { doctorId: doctor.id, queue: queueResponse.data };
          } catch (error) {
            return { doctorId: doctor.id, queue: [] };
          }
        });

        const queueResults = await Promise.all(queuePromises);
        const queuesMap = {};
        let totalPatients = 0;
        let waitingNow = 0;
        let completed = 0;
        let activeDoctors = 0;

        queueResults.forEach(result => {
          queuesMap[result.doctorId] = result.queue;
        });

        doctorsData.forEach(doctor => {
          const queue = queuesMap[doctor.id] || [];
          const waiting = queue.filter(t => t.status === 'waiting').length;
          const completedToday = queue.filter(t => t.status === 'completed').length;
          
          totalPatients += queue.length;
          waitingNow += waiting;
          completed += completedToday;
          
          if (waiting > 0 || queue.some(t => t.status === 'called')) {
            activeDoctors++;
          }
        });

        setDoctorQueues(queuesMap);
        setStats({ totalPatients, waitingNow, completed, activeDoctors });
      } catch (error) {
        console.error('Error refreshing admin data:', error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  // Calculate load balancing suggestions
  const getLoadBalancingSuggestions = () => {
    const doctorWaitingCounts = doctors.map(doctor => ({
      doctor,
      waiting: (doctorQueues[doctor.id] || []).filter(t => t.status === 'waiting').length
    }));

    const maxWaiting = Math.max(...doctorWaitingCounts.map(d => d.waiting));
    const minWaiting = Math.min(...doctorWaitingCounts.map(d => d.waiting));

    if (maxWaiting - minWaiting > 3) {
      const maxDoctor = doctorWaitingCounts.find(d => d.waiting === maxWaiting);
      const minDoctor = doctorWaitingCounts.find(d => d.waiting === minWaiting);
      
      return {
        imbalance: true,
        message: `Queue imbalance detected: Dr. ${maxDoctor.doctor.name} has ${maxWaiting} waiting, Dr. ${minDoctor.doctor.name} has only ${minWaiting}. Consider redirecting patients.`,
        maxDoctor,
        minDoctor
      };
    }

    return { imbalance: false, message: 'Queues are balanced across all doctors.' };
  };

  const loadBalancing = getLoadBalancingSuggestions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
              <Activity className="h-6 w-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hi, {user.name}</span>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalPatients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Waiting Now</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.waitingNow}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Doctors</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activeDoctors}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Load Balancing Suggestions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Load Balancing Suggestions</h2>
          <div className={`rounded-xl p-6 border-l-4 ${
            loadBalancing.imbalance 
              ? 'bg-orange-50 border-orange-500' 
              : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-start">
              {loadBalancing.imbalance ? (
                <AlertTriangle className="h-6 w-6 text-orange-600 mt-1 mr-3 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold ${
                  loadBalancing.imbalance ? 'text-orange-800' : 'text-green-800'
                }`}>
                  {loadBalancing.imbalance ? 'Queue Imbalance Detected' : 'Queues Balanced'}
                </p>
                <p className={`mt-1 ${
                  loadBalancing.imbalance ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {loadBalancing.message}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* All Doctor Queues */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Doctor Queues (Live)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {doctors.map(doctor => {
              const queue = doctorQueues[doctor.id] || [];
              const waiting = queue.filter(t => t.status === 'waiting').length;
              const completed = queue.filter(t => t.status === 'completed').length;
              const currentlySeeing = queue.find(t => t.status === 'called');

              return (
                <div key={doctor.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{doctor.name}</h3>
                      <p className="text-gray-600">{doctor.specialization}</p>
                      <p className="text-sm text-gray-500">{doctor.hospital.name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        Waiting: {waiting}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Completed: {completed}
                      </span>
                    </div>
                  </div>

                  {currentlySeeing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center text-blue-800">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="font-medium">Serving: #{currentlySeeing.tokenNumber} - {currentlySeeing.patient.name}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    Total patients today: {queue.length}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
