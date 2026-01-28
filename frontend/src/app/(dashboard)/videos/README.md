# Video Management UI

Video upload and library management interface for the social media automation platform.

## Features

### Video Upload (`/dashboard/videos/upload`)

- **Drag-and-Drop Upload**: Intuitive drag-and-drop interface
- **File Validation**:
  - Supported formats: MP4, MOV, AVI, WEBM
  - Maximum size: 500MB (configurable via `NEXT_PUBLIC_MAX_UPLOAD_SIZE`)
- **Real-time Progress**: Upload progress bar with percentage
- **Auto-naming**: Automatically extracts video title from filename
- **Success Feedback**: Confirmation message with auto-redirect to library
- **Error Handling**: Clear error messages for validation and upload failures

### Video Library (`/dashboard/videos`)

- **Grid View**: Responsive grid layout (3 columns on large screens, 2 on medium, 1 on mobile)
- **Real-time Status**: Auto-refreshes every 10 seconds to update processing status
- **Status Badges**: Color-coded badges for each video state:
  - 🟡 **Pending**: Waiting to start processing
  - 🟠 **Processing**: Currently being processed (animated spinner)
  - 🟢 **Ready**: Processed and ready to use
  - 🔴 **Failed**: Processing failed (shows error message)

- **Statistics Dashboard**:
  - Total videos count
  - Ready videos count
  - Processing videos count
  - Failed videos count

- **Search & Filter**:
  - Search by video title
  - Filter by status (All, Ready, Processing, Pending, Failed)
  - Sort options:
    - Newest First
    - Oldest First
    - Title (A-Z)

- **Video Card Information**:
  - Thumbnail preview (or status icon if processing)
  - Video title
  - File size
  - Upload date/time
  - Duration (when available)
  - Available platform formats (when ready)
  - Error message (when failed)

### Platform Formats

When a video is processed successfully, badges show available formats:
- **IG Reel**: Instagram Reel (1080x1920, 9:16)
- **IG Feed**: Instagram Feed (1080x1080, 1:1, unlimited duration)
- **YT Shorts**: YouTube Shorts (1080x1920, 9:16)
- **YT Video**: YouTube Video (1920x1080, 16:9)
- **YT Square**: YouTube Square (1080x1080, 1:1, unlimited duration)
- **FB Square**: Facebook Square (1080x1080, 1:1)
- **FB Landscape**: Facebook Landscape (1920x1080, 16:9)

## Components

### VideoUploader (`components/video/VideoUploader.tsx`)

Handles the video upload flow:

```tsx
<VideoUploader />
```

**Features:**
- Drag-and-drop area with visual feedback
- File input fallback
- File validation (type and size)
- Upload progress tracking
- Title input
- Success/error states

**State Management:**
```typescript
interface UploadState {
  file: File | null;
  title: string;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}
```

### VideoCard (`components/video/VideoCard.tsx`)

Displays individual video information:

```tsx
<VideoCard video={video} onClick={() => handleClick(video.id)} />
```

**Props:**
- `video`: Video object with status, title, size, URLs, etc.
- `onClick?`: Optional click handler

**Features:**
- Thumbnail display
- Status badge with icon
- Duration badge
- Platform format badges
- Error message display
- Processing indicator

## API Integration

### Upload Video

```typescript
import { videosApi } from '@/lib/api/videos';

await videosApi.upload(
  {
    video: file,
    title: 'My Video',
  },
  (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
  }
);
```

### Get All Videos

```typescript
const { videos } = await videosApi.getAll();
```

### Get Video by ID

```typescript
const { video } = await videosApi.getById(videoId);
```

### Delete Video

```typescript
await videosApi.delete(videoId);
```

## React Query Integration

The video library uses React Query for data fetching with automatic refetching:

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['videos'],
  queryFn: async () => {
    const response = await videosApi.getAll();
    return response.videos;
  },
  refetchInterval: 10000, // Refetch every 10 seconds
});
```

This ensures processing status updates are shown in real-time without manual refresh.

## User Flow

### Upload Flow

1. User navigates to `/dashboard/videos/upload`
2. User drags and drops video or clicks to browse
3. File is validated (type and size)
4. Video title is auto-populated from filename
5. User can edit title if needed
6. User clicks "Upload Video"
7. Upload progress is displayed
8. On success, user sees confirmation message
9. After 2 seconds, user is redirected to `/dashboard/videos`

### Library Flow

1. User navigates to `/dashboard/videos`
2. Statistics cards show overview
3. User can search, filter, and sort videos
4. Videos with "Processing" status show animated spinner
5. Page auto-refreshes every 10 seconds to update status
6. When video becomes "Ready", format badges appear
7. User can click video card for details (future feature)

## Styling

- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable component library
- **Responsive Design**: Mobile-first approach
- **Color Scheme**:
  - Primary: Blue (#3B82F6)
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Destructive: Red (#EF4444)

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000  # 500MB in bytes
```

## Future Enhancements

- [ ] Video preview modal
- [ ] Video details page
- [ ] Bulk upload
- [ ] Video editing (trim, crop)
- [ ] Custom thumbnail upload
- [ ] Video deletion
- [ ] Download processed videos
- [ ] Batch operations (delete multiple, etc.)
- [ ] Pagination for large video libraries
- [ ] Advanced filters (date range, duration, etc.)

## Performance Considerations

- **Lazy Loading**: Grid items load progressively
- **Optimized Images**: Next.js Image component for thumbnails
- **Debounced Search**: Search input debounced to reduce API calls
- **Memoization**: useMemo for filtered/sorted data
- **Auto-refetch**: Smart refetching only when needed (processing videos)

## Error Handling

- **File Validation Errors**: Shown immediately before upload
- **Upload Errors**: Network errors, server errors displayed clearly
- **Loading States**: Skeleton loaders during data fetch
- **Empty States**: Helpful messages when no videos exist
- **Retry Mechanism**: Users can retry failed operations
