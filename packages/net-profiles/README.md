# @net-protocol/profiles

Net Profiles SDK for reading and writing user profile data on the Net protocol.

## Installation

```bash
npm install @net-protocol/profiles
# or
yarn add @net-protocol/profiles
```

## Features

- **Read profile data**: Profile picture, X username, bio, canvas content
- **Write profile data**: Utilities to prepare Storage.put() transactions
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
| Canvas | Custom HTML profile page | For advanced customization |

## Storage Keys

| Key | Description | Data Format |
|-----|-------------|-------------|
| `PROFILE_PICTURE_STORAGE_KEY` | Profile picture URL | Plain string (URL) |
| `PROFILE_METADATA_STORAGE_KEY` | Profile metadata JSON | `{ x_username: "handle", bio: "..." }` |
| `PROFILE_CANVAS_STORAGE_KEY` | Custom HTML canvas | HTML string |

## API Reference

### Hooks (from `@net-protocol/profiles/react`)

- `useProfilePicture({ chainId, userAddress })` - Fetch profile picture URL
- `useProfileXUsername({ chainId, userAddress })` - Fetch X username
- `useProfileCanvas({ chainId, userAddress })` - Fetch canvas HTML
- `useBasicUserProfileMetadata({ chainId, userAddress })` - Batch fetch picture & username

### Utilities (from `@net-protocol/profiles`)

- `getProfilePictureStorageArgs(imageUrl)` - Prepare picture update args
- `getXUsernameStorageArgs(username)` - Prepare X username update args
- `getBioStorageArgs(bio)` - Prepare bio update args
- `getProfileMetadataStorageArgs(metadata)` - Prepare metadata update args
- `getProfileCanvasStorageArgs(html)` - Prepare canvas update args
- `parseProfileMetadata(json)` - Parse metadata JSON
- `isValidUrl(url)` - Validate URL format
- `isValidXUsername(username)` - Validate X username format
- `isValidBio(bio)` - Validate bio format (max 280 chars, no control chars)

## Dependencies

- `@net-protocol/storage` - Storage SDK
- `@net-protocol/core` - Core utilities
- `viem` - Ethereum utilities

### Peer Dependencies (for React hooks)

- `react` ^18.0.0
- `wagmi` ^2.15.0

## License

MIT
