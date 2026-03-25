import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// ✅ Fixed imports to relative paths
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const sessionId = searchParams.get('session_id');
  const attemptsRef = useRef(0); // Using a ref to track attempts across timeouts

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('error');
    }
    
    // Cleanup function to stop polling if user leaves page
    return () => { attemptsRef.current = 10; };
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attemptsRef.current >= maxAttempts) {
      setStatus('error');
      toast.error('Verification timed out. Please check your dashboard.');
      return;
    }

    try {
      const response = await api.getCheckoutStatus(sessionId);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Subscription activated!');
        return;
      }

      // Increment attempts and schedule next check
      attemptsRef.current += 1;
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      {/* ✅ Added bg-white and shadow-2xl for the premium look */}
      <Card className="w-full max-w-md bg-white shadow-2xl border-none rounded-3xl overflow-hidden animate-fade-in" data-testid="subscription-success-card">
        <div className="h-2 gradient-bg w-full" />
        <CardHeader className="text-center pt-10">
          {status === 'checking' && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-16 w-16 mb-6 animate-spin text-purple-600" />
              <CardTitle className="text-2xl font-bold">Verifying Payment</CardTitle>
              <CardDescription className="text-gray-500 mt-2">
                Hang tight! We're confirming your transaction with Stripe.
              </CardDescription>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Success!</CardTitle>
              <CardDescription className="text-gray-500 mt-2">
                Your GolfCharity subscription is now active.
              </CardDescription>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
              <CardDescription className="text-gray-500 mt-2">
                We couldn't confirm your payment instantly. 
              </CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-8 pb-10">
          {status === 'success' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-600 text-center leading-relaxed">
                  You can now log your golf scores, choose your favorite charities, and enter the monthly prize draws!
                </p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full h-12 text-white font-bold shadow-lg transition-transform active:scale-95"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                data-testid="go-to-dashboard-btn"
              >
                Go to My Dashboard
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 text-center mb-2">
                Don't worry, if your payment was successful, your account will update shortly.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="outline"
                className="w-full h-12 border-gray-200"
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;