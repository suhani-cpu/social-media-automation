'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { AuthResponse, LoginRequest } from '@/lib/types/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const _router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data as LoginRequest);
      const { token, user } = response.data;
      setAuth(user, token);
      localStorage.setItem('token', token);
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.href = '/dashboard';
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Invalid credentials. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Play className="h-7 w-7 fill-current text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Stage OTT</h1>
          <p className="text-sm text-neutral-500 mt-1">Social Media Automation</p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-neutral-500 mb-6">Sign in to your account</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300 text-xs">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
                className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300 text-xs">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>

            <p className="text-center text-xs text-neutral-500">
              Don't have an account?{' '}
              <Link href="/register" className="text-red-500 hover:text-red-400">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
