import React, { useState, useCallback } from "react";
import { Box, useStdout } from "ink";
import {
  FeedList,
  PostList,
  CommentTree,
  Profile,
  Header,
  StatusBar,
  PostInput,
  SenderFilter,
  FeedSearch,
  Help,
  aggregateByFeed,
} from "./components";
import { useFeeds, usePosts, useComments, useProfile, useKeyboard } from "./hooks";
import type { NavEntry } from "./hooks";
import type { NetMessage } from "@net-protocol/feeds";

interface AppProps {
  chainId: number;
  rpcUrl?: string;
  onExit: () => void;
}

export function App({ chainId, rpcUrl, onExit }: AppProps) {
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;

  const [selectedFeedName, setSelectedFeedName] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<NetMessage | null>(null);
  const [profileAddress, setProfileAddress] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isShowingHelp, setIsShowingHelp] = useState(false);
  const [senderFilter, setSenderFilter] = useState<string | undefined>(undefined);

  const feedDataOptions = { chainId, rpcUrl, senderFilter };

  const {
    feeds,
    loading: feedsLoading,
    error: feedsError,
    refetch: refetchFeeds,
  } = useFeeds({ chainId, rpcUrl });

  const {
    posts: rawPosts,
    commentCounts,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = usePosts(selectedFeedName, feedDataOptions);

  // Sort posts by most recent first
  const posts = React.useMemo(
    () => [...rawPosts].sort((a, b) => Number(b.timestamp - a.timestamp)),
    [rawPosts]
  );

  const {
    comments,
    replyCounts,
    loading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useComments(selectedPost, feedDataOptions);

  const {
    messages: profileMessages,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile(profileAddress, { chainId, rpcUrl });

  // Aggregate profile messages by feed for Active On view
  const aggregatedFeeds = React.useMemo(
    () => aggregateByFeed(profileMessages),
    [profileMessages]
  );

  const handleRefresh = useCallback(() => {
    if (profileAddress) {
      refetchProfile();
    } else if (selectedPost) {
      refetchComments();
    } else if (selectedFeedName) {
      refetchPosts();
    } else {
      refetchFeeds();
    }
  }, [profileAddress, selectedPost, selectedFeedName, refetchProfile, refetchComments, refetchPosts, refetchFeeds]);

  const handleCompose = useCallback(() => {
    if (selectedFeedName) {
      setIsComposing(true);
    }
  }, [selectedFeedName]);

  const handleFilter = useCallback(() => {
    setIsFiltering(true);
  }, []);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  const handleShowHelp = useCallback(() => {
    setIsShowingHelp(true);
  }, []);

  const handleSelectFeed = useCallback((index: number) => {
    if (feeds[index]) {
      setSelectedFeedName(feeds[index].feedName);
      setSenderFilter(undefined);
    }
  }, [feeds]);

  const handleSelectPost = useCallback((index: number) => {
    if (posts[index]) {
      setSelectedPost(posts[index]);
    }
  }, [posts]);

  // We need refs to access current selection indices in callbacks
  const selectedPostIndexRef = React.useRef(0);
  const selectedCommentIndexRef = React.useRef(0);

  const handleViewProfile = useCallback(() => {
    // Get the address of the currently selected post or comment
    if (selectedPost) {
      // In comments view: index 0 = post, index 1+ = comments
      const index = selectedCommentIndexRef.current;
      if (index === 0) {
        // Post is selected
        setProfileAddress(selectedPost.sender);
      } else {
        // Comment is selected (actual comment index is index - 1)
        const commentIndex = index - 1;
        if (comments[commentIndex]) {
          setProfileAddress(comments[commentIndex].comment.sender);
        }
      }
    } else if (posts.length > 0) {
      // In posts view, use the selected post's author
      const postIndex = selectedPostIndexRef.current;
      if (posts[postIndex]) {
        setProfileAddress(posts[postIndex].sender);
      }
    }
  }, [selectedPost, posts, comments]);

  const handleSelectProfileItem = useCallback((index: number) => {
    if (index === 0) {
      // "Their Feed" option - navigate to posts view with feedName = profileAddress
      if (profileAddress) {
        setSelectedFeedName(profileAddress);
        setSenderFilter(undefined);
        setProfileAddress(null);
      }
    } else {
      // Active On feed (index - 1)
      const feedIndex = index - 1;
      if (aggregatedFeeds[feedIndex]) {
        const topic = aggregatedFeeds[feedIndex].topic;
        setSelectedFeedName(topic);
        setSenderFilter(profileAddress ?? undefined);
        setProfileAddress(null);
      }
    }
  }, [aggregatedFeeds, profileAddress]);

  const handleGoHome = useCallback(() => {
    setSelectedFeedName(null);
    setSelectedPost(null);
    setProfileAddress(null);
    setSenderFilter(undefined);
  }, []);

  // Toggle user filter: if filtered, clear it; if not, filter by selected post's author
  const handleToggleUserFilter = useCallback(() => {
    if (senderFilter) {
      // Clear the filter
      setSenderFilter(undefined);
    } else {
      // Filter by currently selected post's author
      const postIndex = selectedPostIndexRef.current;
      if (posts[postIndex]) {
        setSenderFilter(posts[postIndex].sender);
      }
    }
  }, [senderFilter, posts]);

  // Handle state restoration from navigation stack
  const handleRestoreState = useCallback((entry: NavEntry) => {
    setSelectedFeedName(entry.feedName);
    setSelectedPost(entry.post);
    setProfileAddress(entry.profileAddress);
    setSenderFilter(entry.senderFilter);
  }, []);

  // Profile items: 1 (Their Feed option) + aggregated feeds
  const profileItemsCount = 1 + aggregatedFeeds.length;

  const {
    viewMode,
    selectedFeedIndex,
    selectedPostIndex,
    selectedCommentIndex,
    selectedProfileIndex,
    setViewMode,
    goBack,
  } = useKeyboard({
    feedsCount: feeds.length,
    postsCount: posts.length,
    commentsCount: 1 + comments.length, // +1 for the post itself
    profileItemsCount,
    // Current context for stack snapshots
    currentFeedName: selectedFeedName,
    currentPost: selectedPost,
    currentProfileAddress: profileAddress,
    currentSenderFilter: senderFilter,
    // Callbacks
    onQuit: onExit,
    onRefresh: handleRefresh,
    onCompose: handleCompose,
    onFilter: handleFilter,
    onSearch: handleSearch,
    onSelectFeed: handleSelectFeed,
    onSelectPost: handleSelectPost,
    onViewProfile: handleViewProfile,
    onSelectProfileItem: handleSelectProfileItem,
    onGoHome: handleGoHome,
    onRestoreState: handleRestoreState,
    onToggleUserFilter: handleToggleUserFilter,
    onShowHelp: handleShowHelp,
  });

  // Keep refs in sync with current selection indices
  React.useEffect(() => {
    selectedPostIndexRef.current = selectedPostIndex;
  }, [selectedPostIndex]);

  React.useEffect(() => {
    selectedCommentIndexRef.current = selectedCommentIndex;
  }, [selectedCommentIndex]);


  // Reset states when going back (handled by stack now, but keep for safety)
  React.useEffect(() => {
    if (viewMode === "feeds") {
      setSelectedFeedName(null);
      setSelectedPost(null);
      setProfileAddress(null);
    } else if (viewMode === "posts") {
      setSelectedPost(null);
    }
  }, [viewMode]);

  const handleComposeSubmit = useCallback((text: string) => {
    // For now, just log - actual posting would require wallet integration
    console.log(`Would post to ${selectedFeedName}: ${text}`);
    setIsComposing(false);
    setViewMode("posts");
  }, [selectedFeedName, setViewMode]);

  const handleComposeCancel = useCallback(() => {
    setIsComposing(false);
    setViewMode("posts");
  }, [setViewMode]);

  const handleFilterSubmit = useCallback((address: string) => {
    setSenderFilter(address || undefined);
    setIsFiltering(false);
    setViewMode("posts");
  }, [setViewMode]);

  const handleFilterCancel = useCallback(() => {
    setIsFiltering(false);
    setViewMode("posts");
  }, [setViewMode]);

  const handleSearchSubmit = useCallback((feedName: string) => {
    setSelectedFeedName(feedName);
    setSenderFilter(undefined);
    setIsSearching(false);
    setViewMode("posts");
  }, [setViewMode]);

  const handleSearchCancel = useCallback(() => {
    setIsSearching(false);
    goBack();
  }, [goBack]);

  const renderContent = () => {
    if (isShowingHelp) {
      return <Help onClose={() => setIsShowingHelp(false)} />;
    }

    if (isComposing && selectedFeedName) {
      return (
        <PostInput
          feedName={selectedFeedName}
          onSubmit={handleComposeSubmit}
          onCancel={handleComposeCancel}
        />
      );
    }

    if (isFiltering) {
      return (
        <SenderFilter
          onSubmit={handleFilterSubmit}
          onCancel={handleFilterCancel}
        />
      );
    }

    if (isSearching) {
      return (
        <FeedSearch
          onSubmit={handleSearchSubmit}
          onCancel={handleSearchCancel}
        />
      );
    }

    switch (viewMode) {
      case "feeds":
        return (
          <FeedList
            feeds={feeds}
            selectedIndex={selectedFeedIndex}
            loading={feedsLoading}
            error={feedsError}
          />
        );
      case "posts":
        return (
          <PostList
            feedName={selectedFeedName ?? ""}
            posts={posts}
            commentCounts={commentCounts}
            selectedIndex={selectedPostIndex}
            loading={postsLoading}
            error={postsError}
          />
        );
      case "comments":
        if (!selectedPost) {
          return null;
        }
        return (
          <CommentTree
            post={selectedPost}
            comments={comments}
            replyCounts={replyCounts}
            selectedIndex={selectedCommentIndex}
            loading={commentsLoading}
            error={commentsError}
          />
        );
      case "profile":
        if (!profileAddress) {
          return null;
        }
        return (
          <Profile
            address={profileAddress}
            activityMessages={profileMessages}
            loading={profileLoading}
            error={profileError}
            selectedIndex={selectedProfileIndex}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" height={terminalHeight}>
      <Header
        viewMode={viewMode}
        chainId={chainId}
        feedName={selectedFeedName}
        senderFilter={senderFilter}
        profileAddress={profileAddress}
      />
      <Box flexGrow={1}>{renderContent()}</Box>
      <StatusBar viewMode={viewMode} />
    </Box>
  );
}
