import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
// ✅ Using relative paths to fix import resolution
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { api } from '../utils/api';
import { ArrowLeft, Calendar, Heart } from 'lucide-react';

const CharityDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charity, setCharity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharity();
  }, [id]);

  const loadCharity = async () => {
    try {
      const response = await api.getCharity(id);
      setCharity(response.data);
    } catch (error) {
      console.error('Failed to load charity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!charity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border">
          <p className="text-gray-600 mb-6 font-medium">We couldn't find that charity partner.</p>
          <Link to="/charities">
            <Button className="gradient-bg">Back to Charities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold gradient-text">
              GolfCharity
            </Link>
            <Link to="/charities">
              <Button variant="ghost" className="text-gray-500 hover:text-purple-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-8 animate-fade-in">
        {/* Main Charity Card */}
        <Card className="bg-white border-none shadow-2xl rounded-3xl overflow-hidden" data-testid="charity-detail-card">
          {charity.image_url && (
            <div className="relative h-64 md:h-96">
              <img 
                src={charity.image_url} 
                alt={charity.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}
          
          <CardHeader className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-3xl md:text-4xl font-extrabold text-gray-900">{charity.name}</CardTitle>
                {charity.featured && (
                  <Badge className="bg-purple-100 text-purple-700 border-none px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">
                    Featured Partner
                  </Badge>
                )}
              </div>
              <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center shadow-inner">
                <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10 flex flex-col gap-8">
            <div className="prose prose-purple max-w-none">
              <h3 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-tight">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {charity.description}
              </p>
            </div>

            {charity.events && charity.events.length > 0 && (
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Upcoming Events & Programs
                </h3>
                <div className="grid gap-3">
                  {charity.events.map((event, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-50">
                      <div className="h-2 w-2 rounded-full gradient-bg" />
                      <span className="text-gray-700 font-medium">{event}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-md">
                <p className="text-sm text-gray-500 leading-relaxed italic">
                  Join the GolfCharity community today. Every subscription provides consistent, sustainable funding to help {charity.name} achieve their goals.
                </p>
              </div>
              <Link to="/register" className="w-full md:w-auto">
                <Button className="gradient-bg w-full md:w-auto px-10 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all" data-testid="support-charity-btn">
                  Join & Support
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharityDetailPage;