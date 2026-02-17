'use client';

import Link from 'next/link';
import { Plus, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PostsPage() {
  return (
    <div className="space-y-6">
      {/* Vibrant Header */}
      <div className="facebook-gradient rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="flex gap-4 justify-end items-start p-4 text-white">
            <FileText className="w-10 h-10 animate-pulse" />
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center vibrant-glow">
              <FileText className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Your Posts 📝</h1>
              <p className="text-white/90 text-lg">Schedule and publish across all platforms 🌍</p>
            </div>
          </div>
          <Link href="/dashboard/posts/create">
            <Button className="bg-white text-primary hover:bg-white/90 hover-scale vibrant-glow text-lg px-6 py-6">
              <Plus className="mr-2 h-5 w-5" />
              Create Post ✨
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Posts</CardTitle>
              <CardDescription>View all your posts across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
                No posts yet. Create your first post to get started!
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <CardTitle>Draft Posts</CardTitle>
              <CardDescription>Posts that are still being edited</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
                No draft posts
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
              <CardDescription>Posts scheduled for future publishing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
                No scheduled posts
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="published">
          <Card>
            <CardHeader>
              <CardTitle>Published Posts</CardTitle>
              <CardDescription>Posts that have been published</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
                No published posts
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
