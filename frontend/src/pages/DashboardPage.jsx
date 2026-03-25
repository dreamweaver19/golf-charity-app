import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// ✅ Updated paths to relative
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Trophy, Heart, Calendar, TrendingUp, LogOut, CreditCard } from 'lucide-react';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [scores, setScores] = useState([]);
  const [charities, setCharities] = useState([]);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreForm, setScoreForm] = useState({
    score_value: '',
    score_date: new Date().toISOString().split('T')
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [subRes, scoresRes, charitiesRes, drawsRes] = await Promise.all([
        api.getMySubscription(),
        api.getMyScores(),
        api.getCharities(),
        api.getDraws()
      ]);

      setSubscription(subRes.data);
      setScores(scoresRes.data);
      setCharities(charitiesRes.data);
      setDraws(drawsRes.data.filter(d => d.status === 'published'));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (packageId) => {
    try {
      const response = await api.createCheckout(packageId);
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate subscription');
    }
  };

  const handleScoreSubmit = async (e) => {
    e.preventDefault();

    if (!subscription || subscription.status !== 'active') {
      toast.error('Active subscription required to submit scores');
      return;
    }

    try {
      await api.createScore({
        score_value: parseInt(scoreForm.score_value),
        score_date: new Date(scoreForm.score_date).toISOString()
      });

      toast.success('Score added successfully!');
      setScoreForm({ score_value: '', score_date: new Date().toISOString().split('T') });
      
      const scoresRes = await api.getMyScores();
      setScores(scoresRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add score');
    }
  };

  const handleCharityUpdate = async (charityId) => {
    try {
      await api.updateCharitySelection(charityId, user.charity_contribution_percent || 10);
      toast.success('Charity selection updated!');
      // Reload user data or update local state if needed
    } catch (error) {
      toast.error('Failed to update charity selection');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const isSubscribed = subscription && subscription.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold gradient-text">
              GolfCharity
            </Link>
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                Hello, {user?.full_name?.split(' ')}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
        {/* Subscription Status */}
        <Card className="bg-white border-none shadow-sm overflow-hidden" data-testid="subscription-card">
          <div className="h-1 gradient-bg w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSubscribed ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1">Active</Badge>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold text-gray-900">Plan:</span> {subscription.plan_type === 'yearly' ? 'Yearly' : 'Monthly'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">Renewal:</span> {new Date(subscription.end_date).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">Manage Subscription</Button>
              </div>
            ) : (
              <div className="py-2">
                <p className="mb-6 text-gray-600">Subscribe to access all features and participate in draws!</p>
                <div className="flex gap-4 flex-wrap">
                  <Button 
                    onClick={() => handleSubscribe('monthly')}
                    className="gradient-bg shadow-md"
                    data-testid="subscribe-monthly-btn"
                  >
                    Subscribe Monthly — $10
                  </Button>
                  <Button 
                    onClick={() => handleSubscribe('yearly')}
                    variant="outline"
                    className="border-purple-200 text-purple-700"
                    data-testid="subscribe-yearly-btn"
                  >
                    Subscribe Yearly — $100 (Save 16%)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="bg-white border p-1 h-12 shadow-sm mb-6" data-testid="dashboard-tabs">
            <TabsTrigger value="scores" className="px-6 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">My Scores</TabsTrigger>
            <TabsTrigger value="charity" className="px-6 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">My Charity</TabsTrigger>
            <TabsTrigger value="draws" className="px-6 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">Draws & Winnings</TabsTrigger>
          </TabsList>

          <TabsContent value="scores" className="animate-fade-in mt-0">
            <div className="grid md:grid-cols-5 gap-8">
              {/* Add Score Form */}
              <div className="md:col-span-2">
                <Card className="bg-white border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Score</CardTitle>
                    <CardDescription>Stableford format (1-45).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSubscribed ? (
                      <form onSubmit={handleScoreSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="score">Score</Label>
                          <Input
                            id="score"
                            type="number"
                            min="1"
                            max="45"
                            className="bg-gray-50 border-gray-100 h-11"
                            value={scoreForm.score_value}
                            onChange={(e) => setScoreForm({ ...scoreForm, score_value: e.target.value })}
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="date">Date</Label>
                          <Input
                            id="date"
                            type="date"
                            className="bg-gray-50 border-gray-100 h-11"
                            value={scoreForm.score_date}
                            onChange={(e) => setScoreForm({ ...scoreForm, score_date: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full bg-gray-900 hover:bg-black h-11 mt-2">
                          Add Score
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                         <p className="text-sm text-gray-500">Subscription required to post scores</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Score History */}
              <div className="md:col-span-3">
                <Card className="bg-white border-none shadow-sm min-h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scores.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {scores.map((score) => (
                          <div key={score.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                              <p className="font-bold text-gray-900">{score.score_value} points</p>
                              <p className="text-xs text-gray-500">
                                {new Date(score.score_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                               <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scores logged yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Charity Tab */}
          <TabsContent value="charity" className="animate-fade-in mt-0">
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Impact
                </CardTitle>
                <CardDescription>
                  10% of your contributions go directly to your chosen charity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {charities.map((charity) => (
                    <div
                      key={charity.id}
                      className={`group relative p-5 border-2 rounded-2xl transition-all hover:shadow-lg ${
                        user?.charity_id === charity.id 
                        ? 'border-purple-600 bg-purple-50/50' 
                        : 'border-gray-100 bg-white'
                      }`}
                      onClick={() => handleCharityUpdate(charity.id)}
                    >
                      {charity.image_url && (
                        <div className="relative h-40 w-full mb-4 overflow-hidden rounded-xl">
                          <img 
                            src={charity.image_url} 
                            alt={charity.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          {user?.charity_id === charity.id && (
                            <div className="absolute top-2 right-2">
                               <Badge className="bg-purple-600 border-none shadow-md">Selected</Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <h3 className="font-bold text-gray-900 mb-1">{charity.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{charity.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Draws Tab */}
          <TabsContent value="draws" className="animate-fade-in mt-0">
            <Card className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Draw Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draws.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {draws.map((draw) => (
                      <div key={draw.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
                             <Calendar className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {new Date(draw.draw_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} Draw
                            </p>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>
                          </div>
                        </div>
                        {draw.numbers_drawn && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Winning Line:</span>
                            {draw.numbers_drawn.map((num, idx) => (
                              <div key={idx} className="w-10 h-10 rounded-full bg-white shadow-sm border border-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                {num}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed rounded-3xl border-gray-100">
                    <p className="text-gray-400">Monthly draw results will appear here once published.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;