'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Manage your social media accounts</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Connect Account
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Instagram</CardTitle>
            <CardDescription>Connect your Instagram account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[100px] items-center justify-center">
              <Button variant="outline" className="w-full">
                Connect Instagram
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>YouTube</CardTitle>
            <CardDescription>Connect your YouTube channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[100px] items-center justify-center">
              <Button variant="outline" className="w-full">
                Connect YouTube
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facebook</CardTitle>
            <CardDescription>Connect your Facebook page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[100px] items-center justify-center">
              <Button variant="outline" className="w-full">
                Connect Facebook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your connected social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            No accounts connected yet. Connect your first account to start posting!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
