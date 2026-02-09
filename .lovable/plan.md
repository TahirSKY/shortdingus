

# 🎬 Remotion Code Playground

A playful, colorful web app where users paste Remotion code and instantly see a live preview, with the ability to download rendered videos via AWS Lambda.

---

## Page 1: Landing Page
A vibrant, eye-catching landing page with:
- Bold headline explaining what the tool does ("Paste code. See video. Download.")
- Animated hero section with playful gradients and colors
- A prominent "Try it now" button leading to the playground
- Brief feature highlights (instant preview, one-click download, no setup needed)

## Page 2: The Playground (Main Feature)
A split-screen editor experience:

### Left Panel — Code Editor
- A large text area / code editor where users paste their entire Remotion project code in one block
- Support for multi-file format using markers like `// --- file: MyComp.tsx ---` to separate files
- The app auto-detects and parses multiple files from a single paste
- Syntax highlighting for a polished feel
- A few example templates users can load with one click (e.g., "Hello World animation", "Counter", "Logo reveal")

### Right Panel — Live Preview
- Uses Remotion's `@remotion/player` component to render a live, playable video preview directly in the browser
- The code is transpiled in real-time using `@babel/standalone` (Remotion's official approach for dynamic compilation)
- Play/pause controls, frame scrubbing, and a timeline
- Error display if the code has issues

### Download Section
- A "Render & Download" button that triggers server-side rendering via Remotion Lambda on AWS
- A progress indicator showing render status
- Once complete, a download link for the MP4 file

## Page 3: Examples Gallery
- A collection of pre-built Remotion code examples users can browse
- Each example shows a thumbnail preview and description
- One-click to load any example into the playground

---

## Backend (Lovable Cloud)

### Edge Function: Render Video
- Receives the user's code and render settings
- Calls Remotion Lambda's `renderMediaOnLambda()` API with AWS credentials (stored securely as secrets)
- Returns render progress and final download URL

### Edge Function: Check Render Progress
- Polls `getRenderProgress()` to track rendering status
- Returns progress percentage and completion status

### Secrets Management
- AWS Access Key ID, Secret Access Key, and region stored securely as Lovable Cloud secrets
- Remotion Lambda function name and serve URL stored as secrets

---

## Required Setup Outside Lovable (One-Time, Guided)
Before the download feature works, you'll need to:
1. Install Remotion CLI on your computer
2. Deploy a Remotion Lambda function to AWS
3. Deploy a Remotion site bundle to S3 that can accept dynamic code via input props
4. Provide the function name and serve URL to the app

I'll walk you through each step when we get there — it's a one-time setup.

---

## Design Style
- **Playful & colorful** — bold gradients (purple to pink to orange), rounded corners, fun micro-interactions
- Vibrant accent colors against a dark code editor background
- Smooth transitions and hover effects
- Emoji/icon usage for personality

