import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Trophy, Users, ArrowRight } from 'lucide-react';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold gradient-text">
              GolfCharity
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/charities" className="text-gray-700 hover:text-purple-600 transition">
                Charities
              </Link>
              {user ? (
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'}>
                  <Button data-testid="dashboard-btn">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" data-testid="login-btn">Login</Button>
                  </Link>
                  <Link to="/register">
                    <Button className="gradient-bg" data-testid="register-btn">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-bg text-white">
        <div className="max-w-6xl mx-auto text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Play. Win. Give Back.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
            Track your golf performance, participate in monthly prize draws, and support charities that matter to you.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100" data-testid="hero-cta-btn">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/charities">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" data-testid="view-charities-btn">
                View Charities
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-600 text-center mb-16 text-lg">Three simple steps to make an impact</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover-lift" data-testid="step-subscribe-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white text-2xl font-bold mb-4">
                  1
                </div>
                <CardTitle>Subscribe</CardTitle>
                <CardDescription>
                  Choose monthly or yearly subscription. Part of your subscription supports your chosen charity.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-lift" data-testid="step-track-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white text-2xl font-bold mb-4">
                  2
                </div>
                <CardTitle>Track Scores</CardTitle>
                <CardDescription>
                  Enter your latest 5 golf scores in Stableford format. Your scores automatically enter you into monthly draws.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-lift" data-testid="step-win-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white text-2xl font-bold mb-4">
                  3
                </div>
                <CardTitle>Win & Give</CardTitle>
                <CardDescription>
                  Participate in monthly draws with cash prizes. Every subscription contributes to your chosen charity.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Join Us?</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center" data-testid="feature-charity">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Support Charities</h3>
              <p className="text-gray-600">
                Minimum 10% of your subscription goes directly to your chosen charity. Increase your contribution anytime.
              </p>
            </div>

            <div className="text-center" data-testid="feature-prizes">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Win Prizes</h3>
              <p className="text-gray-600">
                Monthly draws with three prize tiers. Match 3, 4, or 5 numbers to win from the prize pool.
              </p>
            </div>

            <div className="text-center" data-testid="feature-community">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Join Community</h3>
              <p className="text-gray-600">
                Connect with fellow golfers who care about making a difference through sport.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding gradient-bg text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            Join our community today and start making a difference with every game you play.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100" data-testid="footer-cta-btn">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-lg font-semibold gradient-text mb-2">GolfCharity</p>
          <p className="text-sm">© 2026 GolfCharity Platform. Making golf matter.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;