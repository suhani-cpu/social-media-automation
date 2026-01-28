import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../../../src/lib/store/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
  });

  it('should initialize with null user and token', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login user and set token', () => {
    const { result } = renderHook(() => useAuthStore());

    const mockUser = {
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
    };
    const mockToken = 'mock-jwt-token';

    act(() => {
      result.current.login(mockUser, mockToken);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should logout user and clear state', () => {
    const { result } = renderHook(() => useAuthStore());

    const mockUser = {
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
    };
    const mockToken = 'mock-jwt-token';

    // Login first
    act(() => {
      result.current.login(mockUser, mockToken);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should persist auth state across hook instances', () => {
    const { result: result1 } = renderHook(() => useAuthStore());

    const mockUser = {
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
    };
    const mockToken = 'mock-jwt-token';

    act(() => {
      result1.current.login(mockUser, mockToken);
    });

    // Create new hook instance
    const { result: result2 } = renderHook(() => useAuthStore());

    expect(result2.current.user).toEqual(mockUser);
    expect(result2.current.token).toBe(mockToken);
    expect(result2.current.isAuthenticated).toBe(true);
  });
});
