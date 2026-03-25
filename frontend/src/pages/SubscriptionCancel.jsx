import React from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ Changed @/ to ../ to go up one folder level from 'pages' to 'src'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle } from 'lucide-react';

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <Card className="w-full max-w-md" data-testid="subscription-cancel-card">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <CardTitle>Subscription Cancelled</CardTitle>
          <CardDescription>
            You cancelled the subscription process. No charges were made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="w-full gradient-bg"
            data-testid="back-to-dashboard-btn"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;