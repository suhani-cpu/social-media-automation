import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from '../../../../src/components/video/VideoCard';

// Mock the Badge component
jest.mock('../../../../src/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

// Mock the Button component
jest.mock('../../../../src/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button data-testid="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('VideoCard', () => {
  const mockVideo = {
    id: 'video-1',
    userId: 'user-1',
    title: 'Test Video',
    status: 'READY' as const,
    language: 'ENGLISH' as const,
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    rawVideoUrl: 'https://example.com/video.mp4',
    instagramReelUrl: 'https://example.com/instagram-reel.mp4',
    instagramFeedUrl: 'https://example.com/instagram-feed.mp4',
    youtubeShortsUrl: 'https://example.com/youtube-short.mp4',
    youtubeVideoUrl: 'https://example.com/youtube-video.mp4',
    youtubeSquareUrl: 'https://example.com/youtube-square.mp4',
    facebookSquareUrl: 'https://example.com/facebook-square.mp4',
    facebookLandscapeUrl: 'https://example.com/facebook-landscape.mp4',
    duration: 120,
    fileSize: 10485760,
    processedVideos: {
      instagramReel: 'https://example.com/instagram-reel.mp4',
      instagramFeed: 'https://example.com/instagram-feed.mp4',
      youtubeShort: 'https://example.com/youtube-short.mp4',
      youtubeVideo: 'https://example.com/youtube-video.mp4',
      facebookSquare: 'https://example.com/facebook-square.mp4',
      facebookLandscape: 'https://example.com/facebook-landscape.mp4',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnDelete.mockClear();
  });

  it('should render video card with title', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });

  it('should display status badge', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Ready');
  });

  it('should show all platform format badges when video is ready', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    // Should show 7 platform format badges (6 formats + 1 status badge)
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(6);
  });

  it('should render thumbnail image', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    const thumbnail = screen.getByRole('img');
    expect(thumbnail).toHaveAttribute('src', mockVideo.thumbnailUrl);
    expect(thumbnail).toHaveAttribute('alt', mockVideo.title);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockVideo.id);
  });

  it('should display pending status for videos being processed', () => {
    const processingVideo = {
      ...mockVideo,
      status: 'PROCESSING' as const,
    };

    render(<VideoCard video={processingVideo} onDelete={mockOnDelete} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Processing');
  });

  it('should display failed status for failed videos', () => {
    const failedVideo = {
      ...mockVideo,
      status: 'FAILED' as const,
    };

    render(<VideoCard video={failedVideo} onDelete={mockOnDelete} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Failed');
  });

  it('should format date correctly', () => {
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    // Check if date is displayed (format may vary)
    expect(screen.getByText(/Jan|January/)).toBeInTheDocument();
  });

  it('should not show platform badges for videos that are not ready', () => {
    const pendingVideo = {
      ...mockVideo,
      status: 'PENDING' as const,
      processedVideos: null,
    };

    render(<VideoCard video={pendingVideo} onDelete={mockOnDelete} />);

    // Should only show status badge, not platform badges
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBe(1);
  });
});
