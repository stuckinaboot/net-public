# @net-protocol/profiles

Net Profiles SDK for reading and writing user profile data on the Net protocol.

## Installation

```bash
npm install @net-protocol/profiles
# or
yarn add @net-protocol/profiles
```

## Features

- **Read profile data**: Profile picture, X username, bio, canvas content, custom CSS themes
- **Write profile data**: Utilities to prepare Storage.put() transactions
- **CSS theming**: Demo themes, AI prompt generation, CSS sanitization, and theme selector definitions
- **Efficient batch reads**: `useBasicUserProfileMetadata` batches multiple reads
- **Built on net-storage**: Uses the Net Storage SDK for underlying storage operations

## Usage

### Reading Profile Data (React)

```tsx
import {
  useProfilePicture,
  useProfileXUsername,
  useBasicUserProfileMetadata,
} from "@net-protocol/profiles/react";

function UserProfile({ address }: { address: string }) {
  // Option 1: Individual hooks
  const { profilePicture, isLoading: pictureLoading } = useProfilePicture({
    chainId: 8453, // Base
    userAddress: address,
  });

  const { xUsername, isLoading: usernameLoading } = useProfileXUsername({
    chainId: 8453,
    userAddress: address,
  });

  // Option 2: Batch read (more efficient)
  const { profilePicture, xUsername, isLoading } = useBasicUserProfileMetadata({
    chainId: 8453,
    userAddress: address,
  });

  return (
    <div>
      {profilePicture && <img src={profilePicture} alt="Profile" />}
      {xUsername && <a href={`https://x.com/${xUsername}`}>@{xUsername}</a>}
    </div>
  );
}
```

### Writing Profile Data

```tsx
import { useWriteContract } from "wagmi";
import {
  getProfilePictureStorageArgs,
  getXUsernameStorageArgs,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";

function UpdateProfile() {
  const { writeContract } = useWriteContract();

  const handleUpdatePicture = (imageUrl: string) => {
    const args = getProfilePictureStorageArgs(imageUrl);
    writeContract({
      abi: STORAGE_CONTRACT.abi,
      address: STORAGE_CONTRACT.address,
      functionName: "put",
      args: [args.bytesKey, args.topic, args.bytesValue],
    });
  };

  const handleUpdateXUsername = (username: string) => {
    const args = getXUsernameStorageArgs(username);
    writeContract({
      abi: STORAGE_CONTRACT.abi,
      address: STORAGE_CONTRACT.address,
      functionName: "put",
      args: [args.bytesKey, args.topic, args.bytesValue],
    });
  };

  return (
    <form>
      {/* Form fields */}
    </form>
  );
}
```

## Profile Fields

| Field | Description | Notes |
|-------|-------------|-------|
| Profile Picture | URL to your profile image | Any valid URL (HTTPS, IPFS, etc.) |
| X Username | Your X (Twitter) handle | Stored without @ prefix (e.g., `myusername`) |
| Bio | Short profile bio | Max 280 characters |
| Display Name | User-chosen display name | Max 25 characters |
| Token Address | ERC-20 token that represents you | Valid EVM address (0x-prefixed) |
| Canvas | Custom HTML profile page | For advanced customization |
| CSS Theme | Custom CSS for profile styling | Max 10KB, scoped under `.profile-themed` |

## Storage Keys

| Key | Description | Data Format |
|-----|-------------|-------------|
| `PROFILE_PICTURE_STORAGE_KEY` | Profile picture URL | Plain string (URL) |
| `PROFILE_X_USERNAME_STORAGE_KEY` | X username (legacy, prefer metadata) | Plain string |
| `PROFILE_METADATA_STORAGE_KEY` | Profile metadata JSON | `{ x_username: "handle", bio: "...", display_name: "...", token_address: "0x..." }` |
| `PROFILE_CANVAS_STORAGE_KEY` | Custom HTML canvas | HTML string |
| `PROFILE_CSS_STORAGE_KEY` | Custom CSS theme | CSS string (max 10KB) |

## API Reference

### Hooks (from `@net-protocol/profiles/react`)

- `useProfilePicture({ chainId, userAddress })` - Fetch profile picture URL
- `useProfileXUsername({ chainId, userAddress })` - Fetch X username
- `useProfileCanvas({ chainId, userAddress })` - Fetch canvas HTML
- `useProfileCSS({ chainId, userAddress })` - Fetch custom CSS theme
- `useBasicUserProfileMetadata({ chainId, userAddress })` - Batch fetch picture, username, bio, display name, and token address

### Utilities (from `@net-protocol/profiles`)

- `getProfilePictureStorageArgs(imageUrl)` - Prepare picture update args
- `getXUsernameStorageArgs(username)` - Prepare X username update args
- `getBioStorageArgs(bio)` - Prepare bio update args
- `getDisplayNameStorageArgs(displayName)` - Prepare display name update args
- `getProfileMetadataStorageArgs(metadata)` - Prepare metadata update args
- `getProfileCanvasStorageArgs(html)` - Prepare canvas update args
- `parseProfileMetadata(json)` - Parse metadata JSON
- `isValidUrl(url)` - Validate URL format
- `isValidXUsername(username)` - Validate X username format
- `isValidBio(bio)` - Validate bio format (max 280 chars, no control chars)
- `isValidDisplayName(displayName)` - Validate display name format (max 25 chars, no control chars)
- `getTokenAddressStorageArgs(tokenAddress)` - Prepare token address update args
- `isValidTokenAddress(address)` - Validate EVM token address format
- `getProfileCSSStorageArgs(css)` - Prepare CSS theme update args
- `isValidCSS(css)` - Validate CSS (size limit, no script injection)
- `sanitizeCSS(css)` - Strip dangerous patterns (`<script>`, `javascript:`, `expression()`, `behavior:`, `@import`, `</style>`)

### Theme Utilities (from `@net-protocol/profiles`)

- `THEME_SELECTORS` - Array of all themeable CSS selectors/variables with descriptions
- `DEMO_THEMES` - Built-in demo themes (use `buildCSSPrompt()` or CLI `--list-themes` to discover names)
- `buildCSSPrompt()` - Generate an AI prompt describing the full theming surface
- `MAX_CSS_SIZE` - Maximum CSS size in bytes (10KB)

## Dependencies

- `@net-protocol/storage` - Storage SDK
- `@net-protocol/core` - Core utilities
- `viem` - Ethereum utilities

### Peer Dependencies (for React hooks)

- `react` ^18.0.0
- `wagmi` ^2.15.0

## License

MIT
