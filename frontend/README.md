# Social Media Automation Frontend

Next.js 14 + TypeScript frontend dashboard for social media automation platform.

## Features

- Modern, responsive dashboard built with Next.js 14 (App Router)
- Authentication with JWT and Zustand state management
- Video upload with drag-and-drop and progress tracking
- Multi-step post creation wizard
- AI-powered caption generation (4 languages)
- Post queue with filters and search
- Calendar view for scheduled posts
- Analytics dashboard with custom CSS charts
- shadcn/ui component library
- TailwindCSS styling

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/
│   │   │   ├── login/          # Login page
│   │   │   └── register/       # Register page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   │   ├── dashboard/      # Overview page
│   │   │   ├── videos/         # Video library and upload
│   │   │   ├── posts/          # Post queue and creation
│   │   │   ├── calendar/       # Calendar view
│   │   │   └── analytics/      # Analytics dashboard
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, Header
│   │   ├── video/              # VideoUploader, VideoCard
│   │   ├── post/               # PostCreationWizard, PostCard
│   │   ├── calendar/           # CalendarView
│   │   └── analytics/          # Charts, MetricsCard
│   └── lib/
│       ├── api/                # API client functions
│       │   ├── client.ts       # Axios instance with auth
│       │   ├── auth.ts         # Auth API
│       │   ├── videos.ts       # Video API
│       │   ├── posts.ts        # Post API
│       │   └── analytics.ts    # Analytics API
│       ├── store/
│       │   └── authStore.ts    # Zustand auth state
│       ├── types/
│       │   └── api.ts          # TypeScript types
│       └── utils.ts            # Utility functions
├── public/                     # Static assets
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running on http://localhost:3000

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Upload limit (500MB in bytes)
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
```

### Development

```bash
# Start development server (port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check
```

### Code Quality

```bash
# Lint with Next.js ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format with Prettier
npm run format

# Check formatting
npm run format:check
```

## Features Overview

### 1. Authentication

**Login & Register**
- Email/password authentication
- JWT token stored in Zustand
- Protected routes with auto-redirect
- Form validation with React Hook Form + Zod

**Routes:**
- `/login` - Login page
- `/register` - Register page

### 2. Video Management

**Video Upload**
- Drag-and-drop interface (react-dropzone)
- File validation (MP4, MOV, AVI, WEBM, max 500MB)
- Real-time upload progress
- Auto-redirect to library on success

**Video Library**
- Grid view with thumbnails
- Search by title
- Filter by status (All, Ready, Processing, Pending, Failed)
- Filter by platform formats
- Sort by date, title, status
- Auto-refresh every 10 seconds
- Delete videos

**Routes:**
- `/videos` - Video library
- `/videos/upload` - Upload page

### 3. Post Management

**Post Creation Wizard (5 steps)**

1. **Select Video** - Choose from ready videos
2. **Generate Caption** - AI captions in 4 languages (3 variations each)
3. **Select Platforms** - Instagram, YouTube, Facebook + account + post type
4. **Schedule** - Publish now or schedule for later
5. **Review** - Summary before creation

**Post Queue**
- 5 status tabs: All, Draft, Scheduled, Published, Failed
- Search by caption/video title
- Filter by platform
- Sort by date, status
- Actions: Publish Now, Reschedule, Delete
- Auto-refresh every 10 seconds

**Routes:**
- `/posts` - Post queue
- `/posts/create` - Post creation wizard

### 4. Calendar View

**Monthly Calendar**
- Grid view (Sun-Sat)
- Shows scheduled posts per day
- Color-coded by platform (Instagram: pink, YouTube: red, Facebook: blue)
- Click posts for details modal
- Shows up to 3 posts per day with "+X more" indicator
- List view toggle for chronological display
- Auto-refresh every 30 seconds

**Route:**
- `/calendar` - Calendar view

### 5. Analytics Dashboard

**Metrics Cards**
- Total Views
- Total Likes
- Total Comments
- Total Shares
- Average Engagement Rate

**Charts (CSS-based, no external libraries)**
- Platform Breakdown (horizontal bar chart)
- Views Over Time (vertical bar/column chart, last 14 days)

**Top Performing Posts**
- Top 5 posts by selected metric
- Metric selector: Views, Likes, Engagement Rate
- Thumbnail + caption + metrics

**Filters**
- Date range (default: last 30 days)
- Platform filter

**Route:**
- `/analytics` - Analytics dashboard

## State Management

### Zustand (Client State)

**Auth Store** (`src/lib/store/authStore.ts`)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}
```

### React Query (Server State)

- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

**Example usage:**
```typescript
const { data: videos, isLoading } = useQuery({
  queryKey: ['videos'],
  queryFn: () => videosAPI.getAll(),
  refetchInterval: 10000, // Refetch every 10 seconds
});
```

## API Integration

All API calls go through `/src/lib/api/client.ts` with:
- Automatic Authorization header injection
- Error handling
- TypeScript types
- Base URL from env variable

**Available API modules:**
- `authAPI` - Login, register, logout
- `videosAPI` - Upload, list, get, delete
- `postsAPI` - Create, list, get, publish, delete, generate captions
- `accountsAPI` - Connect, list, delete
- `analyticsAPI` - Get summary, post analytics, top posts

## UI Components

### shadcn/ui Components Used

- `Button` - Action buttons
- `Input` - Form inputs
- `Card` - Content containers
- `Badge` - Status indicators
- `Dialog` - Modals
- `DropdownMenu` - Action menus
- `Select` - Dropdowns
- `Tabs` - Tab navigation
- `Calendar` - Date picker
- `Textarea` - Multi-line inputs
- `Label` - Form labels
- `RadioGroup` - Radio buttons
- `Checkbox` - Checkboxes

### Custom Components

- `VideoUploader` - Drag-drop upload with progress
- `VideoCard` - Video display with actions
- `PostCreationWizard` - 5-step form with validation
- `CaptionGenerator` - AI caption generation UI
- `PlatformSelector` - Multi-platform selection
- `PostCard` - Post display with actions
- `CalendarView` - Monthly calendar grid
- `SimpleBarChart` - CSS-based horizontal bar chart
- `SimpleLineChart` - CSS-based vertical bar chart
- `MetricsCard` - Large metric display
- `Stepper` - Progress indicator

## Form Validation

All forms use React Hook Form + Zod:

**Example:**
```typescript
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  video: z.instanceof(File).refine((file) => file.size <= 500 * 1024 * 1024, {
    message: 'Video must be less than 500MB',
  }),
});

type FormData = z.infer<typeof formSchema>;

const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
});
```

## Styling

### TailwindCSS

Utility-first CSS framework with custom configuration:

**Colors:**
- Primary: Blue
- Success: Green
- Warning: Orange
- Destructive: Red

**Responsive Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Dark Mode

Not implemented yet (future enhancement).

## Performance Optimizations

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component
- **API Caching**: React Query cache with stale-while-revalidate
- **Debounced Search**: 300ms delay on search inputs
- **Lazy Loading**: Dynamic imports for heavy components
- **CSS-based Charts**: No heavy chart libraries

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Docker

```bash
# Build image
docker build -t social-media-frontend .

# Run container
docker run -d -p 3001:3001 --env-file .env.local social-media-frontend
```

### Environment Variables (Production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
```

## Troubleshooting

### API Connection Errors

```bash
# Check backend is running
curl http://localhost:3000/health

# Verify NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_API_URL

# Check CORS settings in backend
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check
```

### Upload Fails

- Check file size (max 500MB)
- Check file format (MP4, MOV, AVI, WEBM)
- Verify backend upload endpoint is working
- Check network tab for errors

## Future Enhancements

- Dark mode support
- Bulk video upload
- Video editor (trim, filters, text overlays)
- Advanced analytics (A/B testing)
- Notifications system
- Team collaboration features
- Mobile responsive improvements
- Internationalization (i18n)
- Accessibility improvements (WCAG 2.1 AA)

## Contributing

See root README.md for contribution guidelines.

## License

MIT
