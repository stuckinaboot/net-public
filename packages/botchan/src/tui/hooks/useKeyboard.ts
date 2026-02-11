import { useState, useCallback, useRef } from "react";
import { useInput } from "ink";
import type { NetMessage } from "@net-protocol/feeds";

export type ViewMode = "feeds" | "posts" | "comments" | "compose" | "filter" | "search" | "profile";

/** Navigation stack entry - captures full state for back navigation */
export interface NavEntry {
  viewMode: ViewMode;
  feedName: string | null;
  post: NetMessage | null;
  profileAddress: string | null;
  senderFilter: string | undefined;
  selectedFeedIndex: number;
  selectedPostIndex: number;
  selectedCommentIndex: number;
  selectedProfileIndex: number;
}

interface NavigationState {
  viewMode: ViewMode;
  selectedFeedIndex: number;
  selectedPostIndex: number;
  selectedCommentIndex: number;
  selectedProfileIndex: number;
}

interface UseKeyboardOptions {
  feedsCount: number;
  postsCount: number;
  commentsCount: number;
  profileItemsCount: number;
  // Current context for stack snapshots
  currentFeedName: string | null;
  currentPost: NetMessage | null;
  currentProfileAddress: string | null;
  currentSenderFilter: string | undefined;
  // Callbacks
  onQuit: () => void;
  onRefresh: () => void;
  onCompose?: () => void;
  onFilter?: () => void;
  onSearch?: () => void;
  onSelectFeed?: (index: number) => void;
  onSelectPost?: (index: number) => void;
  onViewProfile?: () => void;
  onSelectProfileItem?: (index: number) => void;
  onGoHome?: () => void;
  onRestoreState?: (entry: NavEntry) => void;
  onToggleUserFilter?: () => void;
  onShowHelp?: () => void;
}

/**
 * Hook to handle keyboard navigation in TUI with navigation stack
 */
export function useKeyboard(options: UseKeyboardOptions) {
  const [state, setState] = useState<NavigationState>({
    viewMode: "feeds",
    selectedFeedIndex: 0,
    selectedPostIndex: 0,
    selectedCommentIndex: 0,
    selectedProfileIndex: 0,
  });

  // Navigation stack for back button behavior
  const navStackRef = useRef<NavEntry[]>([]);

  // Create a snapshot of current state for the stack
  const createSnapshot = useCallback((): NavEntry => {
    return {
      viewMode: state.viewMode,
      feedName: options.currentFeedName,
      post: options.currentPost,
      profileAddress: options.currentProfileAddress,
      senderFilter: options.currentSenderFilter,
      selectedFeedIndex: state.selectedFeedIndex,
      selectedPostIndex: state.selectedPostIndex,
      selectedCommentIndex: state.selectedCommentIndex,
      selectedProfileIndex: state.selectedProfileIndex,
    };
  }, [state, options.currentFeedName, options.currentPost, options.currentProfileAddress, options.currentSenderFilter]);

  // Push current state to stack before navigating forward
  const pushAndNavigate = useCallback((newViewMode: ViewMode, resetIndex?: { key: keyof NavigationState; value: number }) => {
    // Save current state to stack
    navStackRef.current.push(createSnapshot());

    setState((prev) => {
      const newState = { ...prev, viewMode: newViewMode };
      if (resetIndex) {
        (newState as any)[resetIndex.key] = resetIndex.value;
      }
      return newState;
    });
  }, [createSnapshot]);

  const navigateUp = useCallback(() => {
    setState((prev) => {
      switch (prev.viewMode) {
        case "feeds":
          return {
            ...prev,
            selectedFeedIndex: Math.max(0, prev.selectedFeedIndex - 1),
          };
        case "posts":
          return {
            ...prev,
            selectedPostIndex: Math.max(0, prev.selectedPostIndex - 1),
          };
        case "comments":
          return {
            ...prev,
            selectedCommentIndex: Math.max(0, prev.selectedCommentIndex - 1),
          };
        case "profile":
          return {
            ...prev,
            selectedProfileIndex: Math.max(0, prev.selectedProfileIndex - 1),
          };
        default:
          return prev;
      }
    });
  }, []);

  const navigateDown = useCallback(() => {
    setState((prev) => {
      switch (prev.viewMode) {
        case "feeds":
          return {
            ...prev,
            selectedFeedIndex: Math.min(
              options.feedsCount - 1,
              prev.selectedFeedIndex + 1
            ),
          };
        case "posts":
          return {
            ...prev,
            selectedPostIndex: Math.min(
              options.postsCount - 1,
              prev.selectedPostIndex + 1
            ),
          };
        case "comments":
          return {
            ...prev,
            selectedCommentIndex: Math.min(
              options.commentsCount - 1,
              prev.selectedCommentIndex + 1
            ),
          };
        case "profile":
          return {
            ...prev,
            selectedProfileIndex: Math.min(
              options.profileItemsCount - 1,
              prev.selectedProfileIndex + 1
            ),
          };
        default:
          return prev;
      }
    });
  }, [options.feedsCount, options.postsCount, options.commentsCount, options.profileItemsCount]);

  const selectItem = useCallback(() => {
    switch (state.viewMode) {
      case "feeds":
        if (options.onSelectFeed) {
          options.onSelectFeed(state.selectedFeedIndex);
        }
        pushAndNavigate("posts", { key: "selectedPostIndex", value: 0 });
        break;
      case "posts":
        if (options.onSelectPost) {
          options.onSelectPost(state.selectedPostIndex);
        }
        pushAndNavigate("comments", { key: "selectedCommentIndex", value: 0 });
        break;
      case "profile":
        if (options.onSelectProfileItem) {
          options.onSelectProfileItem(state.selectedProfileIndex);
        }
        pushAndNavigate("posts", { key: "selectedPostIndex", value: 0 });
        break;
      default:
        break;
    }
  }, [state.viewMode, state.selectedFeedIndex, state.selectedPostIndex, state.selectedProfileIndex, options.onSelectFeed, options.onSelectPost, options.onSelectProfileItem, pushAndNavigate]);

  const goBack = useCallback(() => {
    // For compose/filter/search, just go back to posts without popping stack
    if (state.viewMode === "compose" || state.viewMode === "filter") {
      setState((prev) => ({ ...prev, viewMode: "posts" }));
      return;
    }

    // Pop from stack and restore state
    const previousEntry = navStackRef.current.pop();
    if (previousEntry && options.onRestoreState) {
      options.onRestoreState(previousEntry);
      setState({
        viewMode: previousEntry.viewMode,
        selectedFeedIndex: previousEntry.selectedFeedIndex,
        selectedPostIndex: previousEntry.selectedPostIndex,
        selectedCommentIndex: previousEntry.selectedCommentIndex,
        selectedProfileIndex: previousEntry.selectedProfileIndex,
      });
    } else if (state.viewMode !== "feeds") {
      // Fallback: go to feeds if stack is empty
      setState((prev) => ({ ...prev, viewMode: "feeds" }));
    }
  }, [state.viewMode, options.onRestoreState]);

  const startCompose = useCallback(() => {
    if (options.onCompose) {
      setState((prev) => ({ ...prev, viewMode: "compose" }));
      options.onCompose();
    }
  }, [options.onCompose]);

  const startFilter = useCallback(() => {
    if (options.onFilter) {
      setState((prev) => ({ ...prev, viewMode: "filter" }));
      options.onFilter();
    }
  }, [options.onFilter]);

  const startSearch = useCallback(() => {
    if (options.onSearch) {
      // Push current state before search
      navStackRef.current.push(createSnapshot());
      setState((prev) => ({ ...prev, viewMode: "search" }));
      options.onSearch();
    }
  }, [options.onSearch, createSnapshot]);

  const viewProfile = useCallback(() => {
    if (options.onViewProfile) {
      pushAndNavigate("profile", { key: "selectedProfileIndex", value: 0 });
      options.onViewProfile();
    }
  }, [options.onViewProfile, pushAndNavigate]);

  const goHome = useCallback(() => {
    // Clear the stack when going home
    navStackRef.current = [];
    if (options.onGoHome) {
      options.onGoHome();
    }
    setState({
      viewMode: "feeds",
      selectedFeedIndex: 0,
      selectedPostIndex: 0,
      selectedCommentIndex: 0,
      selectedProfileIndex: 0,
    });
  }, [options.onGoHome]);

  useInput((input, key) => {
    // Don't handle input in compose, filter, or search mode
    if (state.viewMode === "compose" || state.viewMode === "filter" || state.viewMode === "search") return;

    if (input === "q") {
      options.onQuit();
    } else if (input === "j" || key.downArrow) {
      navigateDown();
    } else if (input === "k" || key.upArrow) {
      navigateUp();
    } else if (key.return) {
      selectItem();
    } else if (key.escape) {
      goBack();
    } else if (input === "r") {
      options.onRefresh();
    } else if (input === "h") {
      goHome();
    } else if (input === "/") {
      startSearch();
    } else if (input === "p" && (state.viewMode === "posts" || state.viewMode === "comments")) {
      viewProfile();
    } else if (input === "f" && state.viewMode === "posts") {
      startFilter();
    } else if (input === "u" && state.viewMode === "posts") {
      // Toggle user filter
      if (options.onToggleUserFilter) {
        options.onToggleUserFilter();
      }
    } else if (input === "?") {
      // Show help
      if (options.onShowHelp) {
        options.onShowHelp();
      }
    }
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode: mode }));
  }, []);

  return {
    ...state,
    setViewMode,
    navigateUp,
    navigateDown,
    selectItem,
    goBack,
  };
}
