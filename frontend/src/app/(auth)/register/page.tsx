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
import { AuthResponse, RegisterRequest } from '@/lib/types/api';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      const { confirmPassword: _confirmPassword, firstName, lastName, ...rest } = data;
      const registerData = {
        ...rest,
        name: `${firstName} ${lastName}`.trim(),
      };
      const response = await apiClient.post<AuthResponse>(
        '/auth/register',
        registerData as RegisterRequest
      );
      const { token, user } = response.data;

      setAuth(user, token);
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
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
          <h2 className="text-lg font-semibold text-white mb-1">Create account</h2>
          <p className="text-sm text-neutral-500 mb-6">Enter your information to get started</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-neutral-300 text-xs">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  data-testid="name-input"
                  {...register('firstName')}
                  disabled={isLoading}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-neutral-300 text-xs">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  disabled={isLoading}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300 text-xs">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                data-testid="email-input"
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
                data-testid="password-input"
                {...register('password')}
                disabled={isLoading}
                className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-300 text-xs">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                data-testid="confirm-password-input"
                {...register('confirmPassword')}
                disabled={isLoading}
                className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 focus:border-red-600 focus:ring-red-600/20"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div
                className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400"
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isLoading}
              data-testid="register-button"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>

            <p className="text-center text-xs text-neutral-500">
              Already have an account?{' '}
              <Link href="/login" className="text-red-500 hover:text-red-400">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
