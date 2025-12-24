# Setup Checklist for Testing

Use this checklist to verify the example app is working correctly.

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] Web3 wallet extension installed (MetaMask, Coinbase Wallet, etc.)
- [ ] Some ETH on Base network for gas fees

## Installation
- [ ] Navigate to `/examples/basic-app/`
- [ ] Run `npm install` successfully
- [ ] Configure WalletConnect Project ID in `src/providers/Providers.tsx` (optional but recommended)
- [ ] Run `npm run dev` successfully
- [ ] App accessible at http://localhost:3000

## Initial Load Tests
- [ ] Page loads without errors
- [ ] Dark mode/light mode works (based on system preference)
- [ ] RainbowKit connect button appears in header
- [ ] Two tabs visible: "Chat" and "Storage"
- [ ] Chat tab is selected by default

## Wallet Connection Tests
- [ ] Click "Connect Wallet" button
- [ ] Wallet connection modal appears
- [ ] Can connect with MetaMask/other wallet
- [ ] Connected address shows in header
- [ ] Network switches to Base (8453) if not already
- [ ] Can disconnect wallet
- [ ] Can reconnect wallet

## Chat Tab Tests (Before Wallet Connection)
- [ ] Topic selector shows: general, announcements, dev-chat, support
- [ ] Can switch between topics
- [ ] Messages load for each topic (if any exist)
- [ ] "No messages yet" shows for empty topics
- [ ] Message send section shows "Please connect your wallet" warning

## Chat Tab Tests (After Wallet Connection)
- [ ] Message input textarea appears
- [ ] Can type in message textarea
- [ ] "Send" button is disabled when textarea is empty
- [ ] "Send" button is enabled when message is entered
- [ ] Click "Send" - wallet prompts for transaction approval
- [ ] Approve transaction in wallet
- [ ] Status changes: "Sending transaction..." → "Waiting for confirmation..." → "Message sent!"
- [ ] Message input clears after successful send
- [ ] Switch to different topic and back - new message should appear in list
- [ ] Message shows: sender address (truncated), message text, timestamp
- [ ] Auto-scrolls to bottom when new message appears

## Storage Tab Tests (Before Wallet Connection)
- [ ] Shows "Please connect your wallet" message
- [ ] No upload or list functionality available

## Storage Tab Tests (After Wallet Connection)
- [ ] Two buttons visible: "My Content" and "Upload New"
- [ ] "My Content" is selected by default

### My Content View
- [ ] Shows "No stored content yet" if user hasn't stored anything
- [ ] If content exists, shows list of stored items
- [ ] Each item shows: key/filename, timestamp
- [ ] Can click an item to view details

### Upload New View
- [ ] Click "Upload New" button
- [ ] Two input fields appear: "Key / Filename" and "Content / Value"
- [ ] "Store Data" button is disabled when fields are empty
- [ ] Enter key (e.g., "test-note")
- [ ] Enter value (e.g., "Hello, Net Protocol!")
- [ ] "Store Data" button becomes enabled
- [ ] Click "Store Data" - wallet prompts for transaction
- [ ] Approve transaction in wallet
- [ ] Status changes: "Uploading..." → "Confirming..." → "Successfully stored!"
- [ ] Form clears after successful upload
- [ ] Automatically switches back to "My Content" view
- [ ] New item appears in content list

### Content View
- [ ] Click any item in content list
- [ ] Shows "Back to list" button
- [ ] Displays metadata: Key, Description
- [ ] Displays full content in readable format
- [ ] Click "Back to list" - returns to content list

## Edge Cases & Error Handling
- [ ] Disconnect wallet while on Storage tab - shows wallet requirement message
- [ ] Reconnect wallet - restores functionality
- [ ] Reject transaction in wallet - shows error message
- [ ] Try to send empty message - button stays disabled
- [ ] Try to store with empty key - button stays disabled
- [ ] Try to store with empty value - button stays disabled
- [ ] Switch chains in wallet - app should handle gracefully
- [ ] Refresh page - wallet stays connected (if WalletConnect configured)

## Performance Tests
- [ ] Chat messages load quickly (< 2 seconds)
- [ ] Storage content list loads quickly (< 2 seconds)
- [ ] Switching tabs is instant
- [ ] Switching topics is instant
- [ ] No console errors during normal operation

## Code Quality Checks
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No console warnings during development
- [ ] All components follow the clean, educational pattern described in plan
- [ ] Comments are clear and explain Net Protocol concepts
- [ ] Code is DRY and well-organized

## Documentation Tests
- [ ] README.md is comprehensive and clear
- [ ] Installation instructions work as written
- [ ] Code examples in README match actual implementation
- [ ] All links in README work
- [ ] Troubleshooting section addresses common issues

## Final Verification
- [ ] Run `npm run build` successfully
- [ ] No build errors or warnings
- [ ] App works in production mode (`npm run start`)
- [ ] Ready for developers to use as reference

## Known Limitations (Expected Behavior)
- WalletConnect modal may not show all wallets if PROJECT_ID is not configured
- Storage only supports text data (no file uploads in this basic example)
- Shows maximum 20 most recent messages per topic
- Storage list shows only latest version of each key (no version history view)
- Requires manual network switch to Base if user is on different chain

## Issues Found
Use this space to note any issues discovered during testing:

---

