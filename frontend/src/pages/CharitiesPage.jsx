import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// ✅ Changed @/ to ../ for relative path resolution
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { api } from '../utils/api';
import { Heart, Search, Calendar } from 'lucide-react';

const CharitiesPage = () => {
  const [charities, setCharities] = useState([]);
  const [filteredCharities, setFilteredCharities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharities();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = charities.filter(charity =>
        charity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charity.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCharities(filtered);
    } else {
      setFilteredCharities(charities);
    }
  }, [searchTerm, charities]);

  const loadCharities = async () => {
    try {
      const response = await api.getCharities();
      setCharities(response.data);
      setFilteredCharities(response.data);
    } catch (error) {
      console.error('Failed to load charities:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredCharities = filteredCharities.filter(c => c.featured);
  const regularCharities = filteredCharities.filter(c => !c.featured);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold gradient-text">
              GolfCharity
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition">
                Home
              </Link>
              <Link to="/login">
                <Button size="sm" className="gradient-bg border-none shadow-md">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="gradient-bg text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="h-20 w-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Heart className="h-10 w-10 text-white fill-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">Our Charity Partners</h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto leading-relaxed">
            Every subscription fuels a legacy. We partner with world-class organizations making a measurable difference in communities.
          </p>
        </div>
      </section>

      {/* Search Bar - Floating Style */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 mb-16 relative z-10">
        <Card className="bg-white border-none shadow-2xl rounded-2xl p-2">
          <CardContent className="p-0">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-gray-400" />
              <Input
                data-testid="charity-search-input"
                placeholder="Search by name, cause, or mission..."
                className="pl-12 h-14 border-none text-lg bg-transparent focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24">
        {/* Featured Charities */}
        {featuredCharities.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
               <div className="h-1 w-12 gradient-bg rounded-full" />
               <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">Featured Causes</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {featuredCharities.map((charity) => (
                <Link key={charity.id} to={`/charities/${charity.id}`} className="group">
                  <Card className="bg-white border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden h-full flex flex-col" data-testid="featured-charity-card">
                    {charity.image_url && (
                      <div className="relative overflow-hidden h-64">
                        <img 
                          src={charity.image_url} 
                          alt={charity.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-4 left-4">
                           <Badge className="bg-purple-600 border-none px-3 py-1 shadow-lg">Featured Partner</Badge>
                        </div>
                      </div>
                    )}
                    <CardHeader className="p-8">
                      <CardTitle className="text-2xl mb-3 group-hover:text-purple-600 transition-colors">{charity.name}</CardTitle>
                      <CardDescription className="text-base text-gray-500 line-clamp-3 leading-relaxed">
                        {charity.description}
                      </CardDescription>
                    </CardHeader>
                    {charity.events && charity.events.length > 0 && (
                      <CardContent className="p-8 pt-0 mt-auto">
                        <div className="flex items-center gap-3 py-4 border-t border-gray-50 text-sm font-medium text-gray-600">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span>Upcoming: {charity.events}</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Charities Grid */}
        {regularCharities.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-8">
               <div className="h-1 w-12 bg-gray-200 rounded-full" />
               <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">All Partners</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularCharities.map((charity) => (
                <Link key={charity.id} to={`/charities/${charity.id}`} className="group">
                  <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all rounded-2xl overflow-hidden h-full flex flex-col" data-testid="charity-card">
                    {charity.image_url && (
                      <div className="h-44 overflow-hidden">
                        <img 
                          src={charity.image_url} 
                          alt={charity.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader className="p-6">
                      <CardTitle className="text-lg mb-2">{charity.name}</CardTitle>
                      <CardDescription className="text-sm text-gray-500 line-clamp-2">
                        {charity.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredCharities.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-inner border-2 border-dashed border-gray-100">
            <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">No charities found</h3>
            <p className="text-gray-500 mt-2">Try searching for a different keyword or cause.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharitiesPage;