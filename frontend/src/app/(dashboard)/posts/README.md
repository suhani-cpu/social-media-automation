# Post Creation Wizard

Multi-step wizard for creating and scheduling social media posts across Instagram, YouTube, and Facebook.

## Features

### 5-Step Wizard

1. **Video Selection** - Choose from processed videos
2. **Caption Generation** - AI-powered captions in 4 languages
3. **Platform Selection** - Select platforms, accounts, and post types
4. **Schedule** - Publish now or schedule for later
5. **Review** - Confirm all details before creating

### Step 1: Video Selector

**Component:** `VideoSelector.tsx`

- Grid view of ready videos
- Search by video title
- Thumbnail preview
- Video metadata (size, upload date, status)
- Only shows processed (READY) videos
- Single selection

### Step 2: Caption Generator

**Component:** `CaptionGenerator.tsx`

**Features:**
- **Language Selection**: English, Hinglish, Haryanvi, Hindi
- **AI Generation**: Calls backend API to generate 3 caption variations
- **Regenerate**: Generate new variations at any time
- **Selection**: Choose from multiple variations
- **Hashtags**: Automatically included with each caption
- **Preview**: See caption and hashtags before proceeding

**API Integration:**
```typescript
POST /api/posts/generate-caption
{
  "videoTitle": "My Video",
  "language": "ENGLISH",
  "platform": "INSTAGRAM"
}
```

### Step 3: Platform Selector

**Component:** `PlatformSelector.tsx`

**Features:**
- **Multi-Platform**: Select one or more platforms
- **Account Selection**: Choose which account to use per platform
- **Post Type Configuration**:
  - **Instagram**: Reel (9:16), Feed (1:1), Story
  - **YouTube**: Shorts (9:16), Video (16:9), Square (1:1)
  - **Facebook**: Feed (1:1), Video (16:9)
- **Account Status**: Only shows active connected accounts
- **Empty State**: Prompts to connect accounts if none available

**Platform Configuration:**
```typescript
const platformConfig = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Instagram,
    postTypes: ['REEL', 'FEED', 'STORY']
  },
  YOUTUBE: {
    name: 'YouTube',
    icon: Youtube,
    postTypes: ['SHORT', 'VIDEO', 'FEED']
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: Facebook,
    postTypes: ['FEED', 'VIDEO']
  }
}
```

### Step 4: Schedule Selector

**Component:** `ScheduleSelector.tsx`

**Options:**
- **Publish Now**: Create as draft, ready to publish immediately
- **Schedule for Later**: Choose specific date and time

**Features:**
- Radio button selection
- Date/time picker (datetime-local input)
- Minimum date validation (can't schedule in past)
- Timezone display
- Formatted date preview

### Step 5: Review

**Component:** `PostReview.tsx`

**Displays:**
- **Video**: Thumbnail, title, size, status
- **Caption**: Language, full text, hashtags
- **Platforms**: List of selected platforms with account and post type
- **Schedule**: Publish now or scheduled date/time
- **Summary**: Total number of posts to be created

## Components

### Stepper (`components/ui/stepper.tsx`)

Progress indicator showing:
- Current step (highlighted)
- Completed steps (checkmark)
- Future steps (greyed out)
- Step titles and descriptions

### API Clients

#### Posts API (`lib/api/posts.ts`)

```typescript
// Generate caption
await postsApi.generateCaption({
  videoTitle: 'My Video',
  language: 'ENGLISH',
  platform: 'INSTAGRAM'
});

// Create post
await postsApi.create({
  videoId: 'uuid',
  accountId: 'uuid',
  caption: 'Caption text',
  language: 'ENGLISH',
  hashtags: ['#viral', '#trending'],
  platform: 'INSTAGRAM',
  postType: 'REEL',
  scheduledFor: '2026-02-01T10:00:00Z' // Optional
});
```

#### Accounts API (`lib/api/accounts.ts`)

```typescript
// Get all connected accounts
const { accounts } = await accountsApi.getAll();

// Filter active accounts by platform
const instagramAccounts = accounts.filter(
  a => a.platform === 'INSTAGRAM' && a.status === 'ACTIVE'
);
```

## User Flow

### Complete Wizard Flow

1. User clicks "Create Post" from dashboard or posts page
2. **Step 1**: Select a processed video
   - Search if needed
   - Click video card to select
   - Click "Next"

3. **Step 2**: Generate caption
   - Select language (default: English)
   - Click "Generate" button
   - API generates 3 variations
   - Select preferred variation
   - Click "Next"

4. **Step 3**: Select platforms
   - Click platform cards to enable
   - Configure account for each platform
   - Select post type for each platform
   - Can select multiple platforms
   - Click "Next"

5. **Step 4**: Schedule
   - Choose "Publish Now" or "Schedule for Later"
   - If scheduling, pick date and time
   - Click "Next"

6. **Step 5**: Review
   - Review all selections
   - Click "Create Post" (or "Create Posts" if multiple platforms)
   - Posts are created via API
   - Redirected to posts page

### Navigation

- **Back Button**: Go to previous step (disabled on step 1)
- **Next Button**: Proceed to next step (disabled if step incomplete)
- **Cancel Button**: Return to posts page
- **Create Button**: Final step only, creates all posts

### Validation

Each step validates before allowing "Next":
- Step 1: Video must be selected
- Step 2: Caption must be selected
- Step 3: At least one platform must be selected
- Step 4: Always valid (schedule is optional)
- Step 5: Always valid (review only)

## Multi-Platform Creation

When multiple platforms are selected, the wizard:
1. Creates separate post for each platform
2. Uses same video, caption, and schedule
3. Applies platform-specific account and post type
4. Creates all posts in parallel (Promise.all)
5. Shows total count in button ("Create 3 Posts")

**Example:**
```typescript
// User selects Instagram + YouTube + Facebook
// Result: 3 separate posts created
[
  { videoId, accountId: igAccount, platform: 'INSTAGRAM', postType: 'REEL', ... },
  { videoId, accountId: ytAccount, platform: 'YOUTUBE', postType: 'SHORT', ... },
  { videoId, accountId: fbAccount, platform: 'FACEBOOK', postType: 'FEED', ... }
]
```

## State Management

The wizard maintains state for each step:

```typescript
const [currentStep, setCurrentStep] = useState(0);
const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
const [language, setLanguage] = useState<Language>('ENGLISH');
const [selectedCaption, setSelectedCaption] = useState<CaptionVariation | null>(null);
const [platformSelections, setPlatformSelections] = useState<PlatformSelection[]>([]);
const [scheduledFor, setScheduledFor] = useState<string | null>(null);
```

State persists when navigating back/forward through steps.

## Error Handling

- **API Errors**: Displayed below form with retry options
- **Validation Errors**: Next button disabled until step valid
- **Network Errors**: Clear error message with option to retry
- **Empty States**: Helpful messages when no data available

**Error Display:**
```tsx
{error && (
  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
    {error}
  </div>
)}
```

## Styling

- **TailwindCSS**: Utility-first styling
- **shadcn/ui**: Consistent component library
- **Responsive**: Mobile-first design
- **Transitions**: Smooth step transitions
- **Icons**: Lucide React icons
- **Colors**: Platform-specific colors (Instagram pink, YouTube red, Facebook blue)

## API Endpoints Used

### Caption Generation
```http
POST /api/posts/generate-caption
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoTitle": "My Video Title",
  "language": "ENGLISH",
  "platform": "INSTAGRAM"
}
```

### Post Creation
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoId": "uuid",
  "accountId": "uuid",
  "caption": "Caption text with emojis",
  "language": "ENGLISH",
  "hashtags": ["#viral", "#trending"],
  "platform": "INSTAGRAM",
  "postType": "REEL",
  "scheduledFor": "2026-02-01T10:00:00Z"
}
```

### Get Accounts
```http
GET /api/accounts
Authorization: Bearer <token>
```

### Get Videos
```http
GET /api/videos
Authorization: Bearer <token>
```

## Future Enhancements

- [ ] Save as draft without scheduling
- [ ] Edit caption text directly
- [ ] Preview post on platform mockup
- [ ] Bulk post creation (multiple videos)
- [ ] Post templates
- [ ] Custom hashtag sets
- [ ] Caption character count per platform
- [ ] Media kit (multiple images/videos)
- [ ] First comment pre-fill
- [ ] Geo-tagging
- [ ] Collaborator tagging
- [ ] Cross-posting to multiple accounts per platform

## Testing the Wizard

### Prerequisites

1. Backend running on http://localhost:3000
2. At least one ready video in the library
3. At least one connected social account
4. OpenAI API key configured (for caption generation)

### Test Steps

1. **Navigate to wizard:**
   ```
   http://localhost:3001/dashboard/posts/create
   ```

2. **Test video selection:**
   - Verify only READY videos appear
   - Test search functionality
   - Select a video

3. **Test caption generation:**
   - Change language
   - Click Generate
   - Verify 3 variations appear
   - Select different variations
   - Try Regenerate

4. **Test platform selection:**
   - Select Instagram
   - Change account (if multiple)
   - Change post type
   - Add more platforms
   - Remove platforms

5. **Test scheduling:**
   - Select "Publish Now"
   - Switch to "Schedule for Later"
   - Pick a date/time
   - Verify formatted preview

6. **Test review:**
   - Verify all information is correct
   - Click "Create Post(s)"
   - Verify redirect to posts page

## Troubleshooting

### "No ready videos found"
- Upload and wait for video processing
- Check video status in library

### "No connected accounts"
- Connect accounts via accounts page
- Ensure account status is ACTIVE

### "Failed to generate captions"
- Check backend logs
- Verify OpenAI API key
- Check network connection

### "Failed to create posts"
- Check backend logs
- Verify all required fields
- Check account permissions
