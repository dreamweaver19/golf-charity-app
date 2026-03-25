import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { 
  Users, 
  Trophy, 
  Heart, 
  DollarSign, 
  LogOut,
  Plus,
  Trash2
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [charities, setCharities] = useState([]);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charity form state
  const [charityForm, setCharityForm] = useState({
    name: '',
    description: '',
    image_url: '',
    events: '',
    featured: false
  });

  // Draw form state
  const [drawForm, setDrawForm] = useState({
    draw_date: new Date().toISOString().split('T'),
    draw_logic: 'random'
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [analyticsRes, usersRes, charitiesRes, drawsRes] = await Promise.all([
        api.getAnalytics(),
        api.getAllUsers(),
        api.getCharities(),
        api.getDraws()
      ]);

      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setCharities(charitiesRes.data);
      setDraws(drawsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharity = async (e) => {
    e.preventDefault();

    try {
      // ✅ FIXED: Used \n instead of a literal line break
      const events = charityForm.events 
        ? charityForm.events.split('\n').filter(e => e.trim()) 
        : [];

      await api.createCharity({
        name: charityForm.name,
        description: charityForm.description,
        image_url: charityForm.image_url || null,
        events,
        featured: charityForm.featured
      });

      toast.success('Charity created successfully!');
      setCharityForm({ name: '', description: '', image_url: '', events: '', featured: false });
      setDialogOpen(false);
      loadAdminData();
    } catch (error) {
      toast.error('Failed to create charity');
    }
  };
  const handleDeleteCharity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this charity?')) return;

    try {
      await api.deleteCharity(id);
      toast.success('Charity deleted');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to delete charity');
    }
  };

  const handleCreateDraw = async (e) => {
    e.preventDefault();

    try {
      await api.createDraw({
        draw_date: new Date(drawForm.draw_date).toISOString(),
        draw_logic: drawForm.draw_logic
      });

      toast.success('Draw created successfully!');
      setDrawForm({ draw_date: new Date().toISOString().split('T'), draw_logic: 'random' });
      loadAdminData();
    } catch (error) {
      toast.error('Failed to create draw');
    }
  };

  const handleSimulateDraw = async (drawId) => {
    try {
      await api.simulateDraw(drawId);
      toast.success('Draw simulated successfully!');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to simulate draw');
    }
  };

  const handlePublishDraw = async (drawId) => {
    if (!window.confirm('Are you sure you want to publish this draw? This cannot be undone.')) return;

    try {
      await api.publishDraw(drawId);
      toast.success('Draw published successfully!');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to publish draw');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl font-bold gradient-text">
                GolfCharity
              </Link>
              <Badge className="bg-purple-600">Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.full_name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="admin-logout-btn">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="analytics-users">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="analytics-subscriptions">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.active_subscriptions || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="analytics-prize-pool">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
              <Trophy className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.total_prize_pool?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>

          <Card data-testid="analytics-charity-contributions">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Charity Contributions</CardTitle>
              <Heart className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.charity_contributions?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-8">
          <TabsList data-testid="admin-tabs">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="draws">
              <Trophy className="h-4 w-4 mr-2" />
              Draws
            </TabsTrigger>
            <TabsTrigger value="charities">
              <Heart className="h-4 w-4 mr-2" />
              Charities
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" data-testid="users-tab">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} data-testid="user-row">
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Draws Tab */}
          <TabsContent value="draws" data-testid="draws-tab">
            <div className="grid gap-6">
              {/* Create Draw */}
              <Card>
                <CardHeader>
                  <CardTitle>Create New Draw</CardTitle>
                  <CardDescription>Set up a new monthly draw</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateDraw} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="draw_date">Draw Date</Label>
                        <Input
                          id="draw_date"
                          data-testid="draw-date-input"
                          type="date"
                          value={drawForm.draw_date}
                          onChange={(e) => setDrawForm({ ...drawForm, draw_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="draw_logic">Draw Logic</Label>
                        <select
                          id="draw_logic"
                          data-testid="draw-logic-select"
                          className="w-full px-3 py-2 border rounded-md"
                          value={drawForm.draw_logic}
                          onChange={(e) => setDrawForm({ ...drawForm, draw_logic: e.target.value })}
                        >
                          <option value="random">Random</option>
                          <option value="algorithmic">Algorithmic</option>
                        </select>
                      </div>
                    </div>
                    <Button type="submit" data-testid="create-draw-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Draw
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Draw List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Draws</CardTitle>
                  <CardDescription>Manage monthly draws and results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {draws.map((draw) => (
                      <div
                        key={draw.id}
                        className="p-4 border rounded-lg"
                        data-testid="draw-item"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">
                              {new Date(draw.draw_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">Logic: {draw.draw_logic}</p>
                          </div>
                          <Badge
                            className={
                              draw.status === 'published' ? 'bg-green-500' :
                              draw.status === 'simulated' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }
                          >
                            {draw.status}
                          </Badge>
                        </div>

                        {draw.numbers_drawn && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">Numbers:</p>
                            <div className="flex gap-2">
                              {draw.numbers_drawn.map((num, idx) => (
                                <div
                                  key={idx}
                                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold"
                                >
                                  {num}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {draw.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSimulateDraw(draw.id)}
                              data-testid="simulate-draw-btn"
                            >
                              Simulate
                            </Button>
                          )}
                          {draw.status === 'simulated' && (
                            <Button
                              size="sm"
                              onClick={() => handlePublishDraw(draw.id)}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid="publish-draw-btn"
                            >
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Charities Tab */}
          <TabsContent value="charities" data-testid="charities-tab">
            <div className="grid gap-6">
              {/* Create Charity */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Charity</CardTitle>
                  <CardDescription>Register a new charity partner</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="open-charity-dialog-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Charity
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle>Create New Charity</DialogTitle>
                        <DialogDescription>Fill in the charity details below</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCharity} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            data-testid="charity-name-input"
                            placeholder="Charity name"
                            value={charityForm.name}
                            onChange={(e) => setCharityForm({ ...charityForm, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            data-testid="charity-description-input"
                            placeholder="Brief description of the charity"
                            value={charityForm.description}
                            onChange={(e) => setCharityForm({ ...charityForm, description: e.target.value })}
                            required
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="image_url">Image URL</Label>
                          <Input
                            id="image_url"
                            data-testid="charity-image-input"
                            placeholder="https://example.com/image.jpg"
                            value={charityForm.image_url}
                            onChange={(e) => setCharityForm({ ...charityForm, image_url: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="events">Events (one per line)</Label>
                          <Textarea
                            id="events"
                            data-testid="charity-events-input"
                            placeholder={"Annual Charity Golf Day - June 2026\nFundraiser Gala - August 2026"}
                            value={charityForm.events}
                            onChange={(e) => setCharityForm({ ...charityForm, events: e.target.value })}
                            rows={3}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="featured"
                            data-testid="charity-featured-checkbox"
                            checked={charityForm.featured}
                            onChange={(e) => setCharityForm({ ...charityForm, featured: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="featured" className="cursor-pointer">Featured Charity</Label>
                        </div>

                        <Button type="submit" className="w-full" data-testid="create-charity-btn">
                          Create Charity
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Charity List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Charities</CardTitle>
                  <CardDescription>Manage charity partners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {charities.map((charity) => (
                      <div
                        key={charity.id}
                        className="p-4 border rounded-lg bg-white"
                        data-testid="charity-item"
                      >
                        {charity.image_url && (
                          <img
                            src={charity.image_url}
                            alt={charity.name}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{charity.name}</h3>
                          {charity.featured && (
                            <Badge className="bg-purple-500">Featured</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {charity.description}
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCharity(charity.id)}
                          data-testid="delete-charity-btn"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;