# Post Queue and Calendar Views

Comprehensive post management interface with queue/list view and calendar visualization for scheduled posts.

## Features

### Post Queue (`/dashboard/posts`)

Complete post management with filtering, searching, and actions.

**Status Tabs:**
- **All**: All posts regardless of status
- **Draft**: Posts created but not scheduled/published
- **Scheduled**: Posts scheduled for future publishing
- **Published**: Successfully published posts
- **Failed**: Posts that failed to publish

**Filters:**
- **Search**: Search by caption or video title
- **Platform**: Filter by Instagram, YouTube, Facebook, or All
- **Sort**: Newest First, Oldest First, Scheduled Time

**Actions per Post:**
- **Publish Now**: Immediately publish draft/scheduled posts
- **Reschedule**: Change scheduled time
- **Delete**: Remove post permanently

**Features:**
- ✅ Real-time updates (auto-refresh every 10 seconds)
- ✅ Tab counts showing posts per status
- ✅ Post cards with thumbnails
- ✅ Platform icons and colors
- ✅ Status badges
- ✅ Hashtag preview
- ✅ Error messages for failed posts
- ✅ Links to published posts
- ✅ Empty states with helpful CTAs
- ✅ Loading skeletons

### Calendar View (`/dashboard/calendar`)

Visual calendar for scheduled posts with two view modes.

**Calendar View:**
- Monthly calendar grid
- Color-coded posts by platform
- Up to 3 posts shown per day
- "+X more" indicator for overflow
- Navigate between months
- "Today" quick jump
- Current day highlighting
- Click posts to see details

**List View:**
- Chronological list of scheduled posts
- Full post cards with all details
- Sorted by scheduled time
- Actions available per post

**Features:**
- ✅ Toggle between calendar and list views
- ✅ Platform legend
- ✅ Post click for details modal
- ✅ Real-time updates (auto-refresh every 30 seconds)
- ✅ Empty states when no scheduled posts
- ✅ Post count in header

## Components

### PostCard (`components/post/PostCard.tsx`)

Displays individual post information with actions.

**Props:**
```typescript
interface PostCardProps {
  post: Post;
  onPublish?: (postId: string) => void;
  onReschedule?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}
```

**Displays:**
- Video thumbnail
- Platform icon with color
- Status badge
- Video title
- Caption (truncated to 2 lines)
- Hashtags (first 3, with +X more)
- Scheduled date/time or published date/time
- Account username
- Post type (REEL, SHORT, FEED, etc.)
- Error message (if failed)
- Platform URL link (if published)

**Actions Menu:**
- Dropdown with 3-dot icon
- Conditionally shows relevant actions based on status
- Publish Now (for DRAFT/SCHEDULED)
- Reschedule (for DRAFT/SCHEDULED)
- Delete (always available)

### CalendarView (`components/calendar/CalendarView.tsx`)

Monthly calendar visualization of scheduled posts.

**Props:**
```typescript
interface CalendarViewProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}
```

**Features:**
- 7-column grid (Sun-Sat)
- Previous/Next month navigation
- Today button
- Posts displayed on scheduled date
- Platform-specific colors
- Time display on each post
- Caption preview (truncated)
- Overflow handling (+X more)
- Click to open details

**Platform Colors:**
- Instagram: Pink background, pink text, pink border
- YouTube: Red background, red text, red border
- Facebook: Blue background, blue text, blue border

### Tabs Component (`components/ui/tabs.tsx`)

Reusable tabs for switching between views.

**Usage:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="draft">Draft</TabsTrigger>
  </TabsList>
  <TabsContent value="all">Content for all</TabsContent>
  <TabsContent value="draft">Content for draft</TabsContent>
</Tabs>
```

## State Management

### Post Queue Page

```typescript
const [activeTab, setActiveTab] = useState<'all' | PostStatus>('all');
const [searchQuery, setSearchQuery] = useState('');
const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'scheduled'>('newest');
```

**Computed Values:**
- `filteredPosts`: Memoized filtered and sorted posts
- `stats`: Tab counts for each status

**Mutations:**
- `publishMutation`: Publish a post immediately
- `deleteMutation`: Delete a post

### Calendar Page

```typescript
const [view, setView] = useState<'calendar' | 'list'>('calendar');
const [selectedPost, setSelectedPost] = useState<Post | null>(null);
```

**Computed Values:**
- `scheduledPosts`: Filtered to only SCHEDULED status

## API Integration

### Get All Posts
```typescript
const { data: posts } = useQuery({
  queryKey: ['posts'],
  queryFn: async () => {
    const response = await postsApi.getAll();
    return response.posts;
  },
  refetchInterval: 10000, // Auto-refresh
});
```

### Publish Post
```typescript
const publishMutation = useMutation({
  mutationFn: (postId: string) => postsApi.publish(postId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

### Delete Post
```typescript
const deleteMutation = useMutation({
  mutationFn: (postId: string) => postsApi.delete(postId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

## User Flows

### View Posts Queue

1. Navigate to `/dashboard/posts`
2. See all posts in "All" tab
3. Click different tabs to filter by status
4. Use search to find specific posts
5. Filter by platform
6. Change sort order
7. Click actions menu on post card
8. Perform action (publish, reschedule, delete)

### View Calendar

1. Navigate to `/dashboard/calendar`
2. See current month with scheduled posts
3. Posts color-coded by platform
4. Navigate to different months
5. Click "Today" to jump to current date
6. Click a post to see details
7. Switch to "List View" for chronological list
8. Perform actions from list view

### Post Actions

**Publish Now:**
1. Click 3-dot menu on post card
2. Select "Publish Now"
3. Confirm in dialog
4. Post status changes to PUBLISHING → PUBLISHED
5. Platform URL appears on post card

**Delete:**
1. Click 3-dot menu on post card
2. Select "Delete"
3. Confirm in dialog
4. Post removed from list
5. Tab counts update

**Reschedule:**
1. Click 3-dot menu on post card
2. Select "Reschedule"
3. (Feature placeholder - opens modal to select new date/time)

## Empty States

**No Posts at All:**
- Large plus icon
- "No posts yet" heading
- "Create your first post" message
- "Create Post" button

**No Matching Filters:**
- Filter icon
- "No posts match your filters" heading
- "Try adjusting..." message
- "Clear Filters" button

**No Scheduled Posts (Calendar):**
- Calendar icon
- "No scheduled posts" heading
- "Create a post and schedule it" message
- "Create Post" button

## Auto-Refresh

- **Post Queue**: Refetches every 10 seconds
- **Calendar**: Refetches every 30 seconds
- Updates status changes automatically (SCHEDULED → PUBLISHING → PUBLISHED)
- No manual refresh needed

## Filtering Logic

```typescript
// Tab filter
if (activeTab !== 'all') {
  filtered = filtered.filter((post) => post.status === activeTab);
}

// Search filter
if (searchQuery) {
  filtered = filtered.filter((post) =>
    post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.video?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
}

// Platform filter
if (platformFilter !== 'ALL') {
  filtered = filtered.filter((post) => post.platform === platformFilter);
}

// Sort
filtered.sort((a, b) => {
  switch (sortBy) {
    case 'newest':
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case 'oldest':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case 'scheduled':
      // Sort by scheduled time
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
  }
});
```

## Responsive Design

- **Mobile**: Single column, stacked filters
- **Tablet**: 2 columns for calendar days, side-by-side filters
- **Desktop**: Full 7-column calendar, horizontal filters

## Future Enhancements

- [ ] Bulk actions (select multiple posts)
- [ ] Drag-and-drop reschedule in calendar
- [ ] Week/Day view for calendar
- [ ] Filter by date range
- [ ] Export posts to CSV
- [ ] Duplicate post
- [ ] Post templates
- [ ] Performance analytics per post
- [ ] Post preview before publish
- [ ] Edit draft posts
- [ ] Notification for failed posts
- [ ] Calendar integrations (Google Calendar, Outlook)

## Testing

### Test Post Queue

1. Create posts with different statuses
2. Verify tab counts update
3. Test search functionality
4. Filter by each platform
5. Sort by different options
6. Publish a draft post
7. Delete a post
8. Verify empty states

### Test Calendar

1. Schedule multiple posts on same day
2. Navigate between months
3. Click posts to see details
4. Switch to list view
5. Verify posts sorted by time
6. Test with no scheduled posts
7. Verify today highlighting
8. Test month navigation

## Performance Optimization

- **Memoization**: `useMemo` for filtered posts and stats
- **Debouncing**: Search input could be debounced (not implemented)
- **Pagination**: Not needed yet, but could add for large post counts
- **Lazy Loading**: Calendar months loaded on demand
- **Optimistic Updates**: Mutations optimistically update UI

## Accessibility

- Keyboard navigation for tabs
- ARIA labels for icon buttons
- Focus management in modals
- Color contrast meets WCAG AA
- Screen reader friendly

## Error Handling

- Failed posts show error message
- Mutations show errors in console
- Confirm dialogs before destructive actions
- Retry available on API failures
