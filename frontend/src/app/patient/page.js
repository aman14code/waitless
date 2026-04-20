'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Hospital, LogOut, Clock, Users, AlertCircle } from 'lucide-react';
import { io } from 'socket.io-client';

// MyTokenCard Component
function MyTokenCard({ token, onQueueUpdate }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const response = await api.get(`/api/tokens/queue/${token.doctor.id}`);
      setQueue(response.data);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Socket.io connection for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL);
    
    socket.on('queue-updated', (data) => {
      if (data.doctorId === token.doctor.id) {
        fetchQueue();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token.doctor.id]);

  // Calculate position and wait time
  const myIndex = queue.findIndex(t => t.id === token.id);
  const myPosition = myIndex >= 0 ? myIndex + 1 : null;
  const ahead = myIndex >= 0 ? queue.slice(0, myIndex).filter(t => ['waiting', 'called'].includes(t.status)).length : 0;
  const estWait = ahead * 5; // 5 minutes per patient

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'called': return 'bg-green-100 text-green-800 animate-pulse';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'missed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return 'Waiting';
      case 'called': return 'Called';
      case 'completed': return 'Completed';
      case 'missed': return 'Missed';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{token.doctor.hospital.name}</h3>
          <p className="text-gray-600">{token.doctor.name}</p>
          <p className="text-sm text-gray-500">{token.doctor.specialization}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(token.status)}`}>
          {getStatusText(token.status)}
        </span>
      </div>

      {/* Alert Banners */}
      {token.status === 'called' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800 font-semibold text-center">
            🎉 It's YOUR TURN! Go to the doctor now.
          </p>
        </div>
      )}

      {ahead === 3 && token.status === 'waiting' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 font-semibold text-center">
            ⚠️ Only 3 patients ahead! Get ready.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Your Token</p>
          <p className="text-2xl font-bold text-blue-600">#{token.tokenNumber}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Ahead of You</p>
          <p className="text-2xl font-bold text-orange-600">{ahead}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Est. Wait</p>
          <p className="text-2xl font-bold text-green-600">{estWait}m</p>
        </div>
      </div>

      {/* Queue Position */}
      {myPosition && (
        <div className="text-center text-sm text-gray-600">
          Your position in queue: <span className="font-semibold">#{myPosition}</span> of {queue.length}
        </div>
      )}
    </div>
  );
}

// DoctorCard Component
function DoctorCard({ doctor, onBookToken }) {
  const [loading, setLoading] = useState(false);

  const handleBookToken = async () => {
    setLoading(true);
    try {
      await api.post('/api/tokens/book', { doctorId: doctor.id });
      toast.success('Token booked successfully!');
      onBookToken(); // Refresh tokens
    } catch (error) {
      if (error.response?.data?.error?.includes('already have an active token')) {
        toast.error('You already have an active token for this doctor today.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to book token');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="font-semibold text-lg text-gray-900 mb-2">{doctor.name}</h3>
      <p className="text-gray-600 mb-1">{doctor.specialization}</p>
      <p className="text-sm text-gray-500 mb-4">{doctor.hospital.name}</p>
      <button
        onClick={handleBookToken}
        disabled={loading || !doctor.available}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : doctor.available ? (
          'Book Token'
        ) : (
          'Not Available'
        )}
      </button>
    </div>
  );
}

export default function PatientDashboard() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [doctors, setDoctors] = useState([]);
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

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch user's tokens
        const tokensResponse = await api.get('/api/tokens/my');
        setTokens(tokensResponse.data);

        // Fetch available doctors
        const doctorsResponse = await api.get('/api/doctors');
        setDoctors(doctorsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
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
    
    socket.on('queue-updated', () => {
      // Refresh tokens when queue updates
      api.get('/api/tokens/my')
        .then(response => setTokens(response.data))
        .catch(error => console.error('Error refreshing tokens:', error));
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

  const refreshTokens = () => {
    api.get('/api/tokens/my')
      .then(response => setTokens(response.data))
      .catch(error => console.error('Error refreshing tokens:', error));
  };

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
            <Link href="/" className="flex items-center space-x-2">
              <Hospital className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">WaitLess</span>
            </Link>
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
        {/* My Tokens Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-blue-600" />
            My Tokens Today
          </h2>
          
          {tokens.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No tokens yet.</p>
              <p className="text-gray-500">Book one below to join the queue.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map(token => (
                <MyTokenCard 
                  key={token.id} 
                  token={token} 
                  onQueueUpdate={refreshTokens}
                />
              ))}
            </div>
          )}
        </section>

        {/* Available Doctors Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-blue-600" />
            Available Doctors
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doctor => (
              <DoctorCard 
                key={doctor.id} 
                doctor={doctor} 
                onBookToken={refreshTokens}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
