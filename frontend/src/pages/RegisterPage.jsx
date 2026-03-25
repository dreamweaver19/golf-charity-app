import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// ✅ Changed @/ to ../ for all imports
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { api } from '../utils/api';
import { toast } from 'sonner';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    charity_id: '',
    charity_contribution_percent: 10
  });
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCharities();
  }, []);

  const loadCharities = async () => {
    try {
      const response = await api.getCharities();
      setCharities(response.data);
    } catch (error) {
      console.error('Failed to load charities:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Registration successful! Welcome aboard!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      {/* ✅ Added bg-white, shadow-xl, and border-none to fix the visual 'naked' look */}
      <Card className="w-full max-w-md bg-white shadow-xl animate-fade-in border-none" data-testid="register-card">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">
            <Link to="/" className="gradient-text">GolfCharity</Link>
          </CardTitle>
          <CardDescription className="text-gray-500">Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                data-testid="fullname-input"
                placeholder="John Doe"
                className="bg-gray-50 border-gray-200"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="you@example.com"
                className="bg-gray-50 border-gray-200"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                placeholder="••••••••"
                className="bg-gray-50 border-gray-200"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Minimum 6 characters</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="charity">Select a Charity (Optional)</Label>
              <Select 
                value={formData.charity_id} 
                onValueChange={(value) => setFormData({ ...formData, charity_id: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200" data-testid="charity-select">
                  <SelectValue placeholder="Choose a charity" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {charities.map((charity) => (
                    <SelectItem key={charity.id} value={charity.id}>
                      {charity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">
                10% of your subscription will support this charity
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full text-white font-bold py-6 mt-2 transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              data-testid="register-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-purple-600 hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;