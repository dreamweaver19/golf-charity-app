import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// ✅ Using relative paths to avoid alias issues
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Login successful!');
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      {/* ✅ Fixed: Added bg-white and shadow-2xl to give it the "clean" look */}
      <Card className="w-full max-w-md bg-white shadow-2xl border-none animate-fade-in" data-testid="login-card">
        <CardHeader className="space-y-1 text-center pt-8">
          <CardTitle className="text-3xl font-bold">
            <Link to="/" className="gradient-text">GolfCharity</Link>
          </CardTitle>
          <CardDescription className="text-gray-500">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="you@example.com"
                className="bg-gray-50 border-gray-200 h-12 focus:ring-purple-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="bg-gray-50 border-gray-200 h-12 focus:ring-purple-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full text-white font-bold h-12 rounded-lg transition-all hover:opacity-90 active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              data-testid="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-purple-600 hover:underline font-semibold">
              Create one
            </Link>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
            <p className="uppercase tracking-widest mb-2 font-semibold">Admin credentials for testing</p>
            <div className="bg-gray-50 py-2 rounded font-mono">
              admin@example.com / Admin@1234
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;