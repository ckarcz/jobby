# How React Powers the Terminal UI

This document explains how the interactive terminal UI (`jobby-cli ui`) works under the hood. It assumes no prior React knowledge and walks through the system top-down — starting from what you see on screen and drilling into how it all connects.

---

## Table of Contents

- [The Big Picture](#the-big-picture)
- [Key Concepts](#key-concepts)
  - [Components](#components)
  - [State](#state)
  - [Actions and the Reducer](#actions-and-the-reducer)
  - [Context](#context)
  - [Hooks](#hooks)
  - [Effects](#effects)
- [The Component Tree](#the-component-tree)
- [How the App Starts](#how-the-app-starts)
- [Walkthroughs: When You Do X, React Does Y](#walkthroughs-when-you-do-x-react-does-y)
  - [App Launch](#app-launch)
  - [Pressing `/` to Focus the Search Bar](#pressing--to-focus-the-search-bar)
  - [Typing a Keyword and Pressing Enter](#typing-a-keyword-and-pressing-enter)
  - [Scrolling Through Results with Arrow Keys](#scrolling-through-results-with-arrow-keys)
  - [Pressing Enter on a Job to Open Details](#pressing-enter-on-a-job-to-open-details)
  - [Opening the Filter Drawer](#opening-the-filter-drawer)
  - [Pressing Escape from the Search Bar](#pressing-escape-from-the-search-bar)
  - [Pressing Escape from Results](#pressing-escape-from-results)
  - [Resizing the Terminal Window](#resizing-the-terminal-window)
  - [Pressing Ctrl+C to Quit](#pressing-ctrlc-to-quit)
- [Data Flow Diagram](#data-flow-diagram)
- [File Reference](#file-reference)

---

## The Big Picture

React is a library for building user interfaces out of small, composable pieces called **components**. Normally React builds web pages in a browser, but this project uses **Ink** — a library that lets React render to a terminal instead. Same programming model, different output target.

The core idea is simple:

1. The entire UI is described by a single **state** object (a plain data structure).
2. When the user does something (presses a key, resizes the terminal), the app sends an **action** describing what happened.
3. A **reducer** function takes the current state + the action and produces a new state.
4. React automatically figures out what changed and redraws only the parts of the terminal that need updating.

```
User input  →  Action  →  Reducer  →  New State  →  React re-renders  →  Terminal updates
```

You never manually redraw the screen. You just update the data, and React handles the rest.

---

## Key Concepts

### Components

A **component** is a function that takes some data and returns a description of what should appear on screen. Components can contain other components, forming a tree.

```tsx
function WelcomeScreen() {
  return (
    <Box>
      <Text>Press / to start searching</Text>
    </Box>
  );
}
```

`<Box>` and `<Text>` are Ink's terminal equivalents of HTML's `<div>` and `<span>`. `<Box>` handles layout (flexbox), `<Text>` renders characters.

Components re-run every time the data they depend on changes. If `WelcomeScreen` used a piece of state that changed, React would call the function again, get the new output, compare it to the old output, and update only the terminal cells that differ.

### State

**State** is a plain JavaScript object that holds everything the app needs to know at any given moment:

```ts
{
  // Terminal dimensions
  terminalWidth: 120,
  terminalHeight: 40,
  maxWidth: 120,
  maxHeight: 40,

  // Panel focus — which panel currently owns keyboard input
  focusedPanel: null,         // null | 'search' | 'results' | 'filters' | 'details'

  // Search lifecycle
  searchKeyword: '',
  searchStatus: 'idle',       // 'idle' | 'searching' | 'results' | 'error'
  totalResults: [],           // all jobs accumulated across pages
  searchResults: [],          // jobs returned by the most recent fetch (one page)
  searchPagination: undefined,
  searchMetadata: undefined,
  searchQuery: undefined,
  searchError: undefined,
  selectedJobIndex: 0,

  // Pagination / load-more
  loadMoreStatus: 'idle',     // 'idle' | 'loading' | 'exhausted' | 'error'
  loadMoreError: undefined,

  // Filters
  searchFilters: { jobType: [], experienceLevel: [], ... },
  filterDrawerOpen: false,

  // Job details panel
  jobDetails: null,
  jobDetailsStatus: 'idle',   // 'idle' | 'loading' | 'loaded' | 'error'
  jobDetailsError: undefined,
}
```

This is the single source of truth. Every component reads from this object to decide what to render. Nothing is stored in random variables scattered around the code — it's all here.

The `focusedPanel` field tracks which of four named panels currently owns keyboard focus: `'search'`, `'results'`, `'filters'`, or `'details'`. When `focusedPanel` is `null`, no panel is focused.

### Actions and the Reducer

You never modify state directly. Instead, you create an **action** — a small object describing what happened:

```ts
{ type: 'FOCUS_PANEL', panel: 'search' }
{ type: 'SEARCH_START' }
{ type: 'SET_SELECTED_JOB_INDEX', index: 3 }
{ type: 'OPEN_FILTER_DRAWER' }
{ type: 'JOB_DETAILS_SUCCESS', details: { ... } }
```

The **reducer** is a pure function that takes the current state and an action, and returns a brand new state object:

```ts
function appReducer(state, action) {
  switch (action.type) {
    case 'FOCUS_PANEL':
      return { ...state, focusedPanel: action.panel };
    case 'SEARCH_START':
      return { ...state, searchStatus: 'searching', searchError: undefined, ... };
    // ... other cases
  }
}
```

The `{ ...state, focusedPanel: action.panel }` syntax means "copy everything from the old state, but override `focusedPanel` with the new value." The old state is never mutated — a fresh object is always returned.

This pattern has a major benefit: every state transition is explicit and traceable. If you want to know what happens when a search succeeds, you look at the `SEARCH_SUCCESS` case in the reducer. There's no hidden logic.

Here are all the actions the app can dispatch:

| Action | When It Fires | What It Changes |
|---|---|---|
| `SET_TERMINAL_SIZE` | Terminal window is resized | `terminalWidth`, `terminalHeight`, `maxWidth`, `maxHeight` |
| `FOCUS_PANEL` | User navigates to a panel | `focusedPanel` |
| `BLUR_ALL` | User leaves all panels | `focusedPanel` -> `null` |
| `SET_SEARCH_KEYWORD` | User submits a search | `searchKeyword` |
| `SEARCH_START` | Search API call begins | `searchStatus` -> `'searching'`, clears errors and job details |
| `SEARCH_SUCCESS` | API returns results | `searchStatus` -> `'results'`, fills `totalResults`, `searchResults`, pagination, metadata, query; resets `selectedJobIndex` |
| `SEARCH_ERROR` | API call fails | `searchStatus` -> `'error'`, sets `searchError` |
| `SET_SELECTED_JOB_INDEX` | User navigates the results list | `selectedJobIndex` |
| `CLEAR_RESULTS` | User presses `Escape` on results | Resets everything search-related back to idle, clears job details |
| `LOAD_MORE_START` | Next-page fetch begins | `loadMoreStatus` -> `'loading'` |
| `LOAD_MORE_SUCCESS` | Next-page fetch returns | Appends to `totalResults`, updates pagination; `loadMoreStatus` -> `'exhausted'` if empty |
| `LOAD_MORE_ERROR` | Next-page fetch fails | `loadMoreStatus` -> `'error'`, sets `loadMoreError` |
| `OPEN_FILTER_DRAWER` | User presses `\` | `filterDrawerOpen` -> `true` |
| `CLOSE_FILTER_DRAWER` | User applies/cancels filters | `filterDrawerOpen` -> `false` |
| `APPLY_FILTERS` | User confirms filters | `searchFilters` updated |
| `JOB_DETAILS_START` | Details fetch begins (debounced) | `jobDetailsStatus` -> `'loading'` |
| `JOB_DETAILS_SUCCESS` | Details fetch completes | `jobDetails` -> data, `jobDetailsStatus` -> `'loaded'` |
| `JOB_DETAILS_ERROR` | Details fetch fails | `jobDetailsStatus` -> `'error'`, sets `jobDetailsError` |
| `CLEAR_JOB_DETAILS` | Selection changes | `jobDetails` -> `null`, `jobDetailsStatus` -> `'idle'` |

### Context

React components form a tree (parent -> children -> grandchildren). **Context** is React's mechanism for sharing data across the entire tree without passing it through every intermediate component as a parameter.

The `App` component at the root creates the state and a `dispatch` function, then wraps the whole tree in a **Provider**:

```tsx
function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppInner />
    </AppContext.Provider>
  );
}
```

Any component anywhere in the tree can then access state or dispatch actions:

```ts
const { totalResults, selectedJobIndex } = useAppState();   // read state
const dispatch = useAppDispatch();                           // send actions
const focused = useFocusedPanel();                          // which panel owns focus?
dispatch({ type: 'FOCUS_PANEL', panel: 'search' });
```

`context.ts` exports three helpers: `useAppState()`, `useAppDispatch()`, and `useFocusedPanel()`. A fourth helper — `usePanelFocus(panelId)` — lives in `hooks/usePanelFocus.ts` and returns a simple boolean: `true` if the given panel currently owns focus.

### Hooks

**Hooks** are functions that let components "hook into" React features. They always start with `use`. This app uses several:

| Hook | Where It Lives | What It Does |
|---|---|---|
| `useReducer` | React built-in | Creates the state + dispatch pair. Core state management for complex state. |
| `useState` | React built-in | Creates a simple local state variable (viewport tracking, scroll offset). |
| `useContext` | React built-in | Reads from the shared context (wrapped by `useAppState` / `useAppDispatch` helpers). |
| `useCallback` | React built-in | Memoizes a function so it doesn't get recreated on every render. |
| `useMemo` | React built-in | Memoizes an expensive computed value. |
| `useRef` | React built-in | Holds a mutable value (abort controller, debounce timer) that doesn't trigger re-renders. |
| `useEffect` | React built-in | Runs side effects — API calls, event listeners, debounce timers. |
| `useInput` | Ink | Registers a keyboard handler; accepts `{ isActive }` to enable/disable it. |
| `useApp` | Ink | Gives access to app-level controls like `exit()`. |
| `useFullScreen` | `hooks/` | Tracks terminal resize events and dispatches `SET_TERMINAL_SIZE`. |
| `useKeyboardNavigation` | `hooks/` | Global keyboard router: `\` (filters), `/` (search), `Escape` from details/filters. |
| `useSearchFocusSync` | `hooks/` | Automatically focuses the results panel after a successful search. |
| `useJobDetails` | `hooks/` | Debounces and fetches job details when `selectedJobIndex` changes. |
| `usePanelFocus` | `hooks/` | Returns `true` if a given `PanelId` currently owns focus. |
| `useSearch` | `hooks/` | Fires the initial LinkedIn search and exposes a `loadMore` function for pagination. |
| `useResultsKeyboard` | `hooks/` | Arrow/Page/Home/End navigation, Enter (open details), Escape (clear results). |
| `useDetailsKeyboard` | `hooks/` | Arrow/Page/Home/End scrolling inside the job details panel. |
| `useFilterKeyboard` | `hooks/` | Navigation, Tab between sections, Space to toggle, Enter to apply. |
| `useFilterDraft` | `hooks/` | Manages the filter drawer's local draft state; resets on each open. |
| `useContainerHeight` | `hooks/` | Measures a DOM element's height after render for scroll limit calculation. |
| `useTimedVisibility` | `hooks/` | Returns `true` for a fixed duration after a trigger value appears. |

### Effects

Most of React is "pure" — given the same state, the same output is produced. But some things are inherently impure: making API calls, listening for terminal resize events, managing debounce timers. These are called **side effects**, and React handles them with the `useEffect` hook.

```ts
useEffect(() => {
  // This runs AFTER React finishes rendering.
  const onResize = () => {
    dispatch({ type: 'SET_TERMINAL_SIZE', width: ..., height: ... });
  };
  process.stdout.on('resize', onResize);

  // This cleanup function runs when the component is removed or before re-running.
  return () => {
    process.stdout.removeListener('resize', onResize);
  };
}, [dispatch]);  // Only re-run if dispatch changes (it won't).
```

The pattern is: set up -> return cleanup. React guarantees the cleanup runs before the effect re-runs or when the component is destroyed.

---

## The Component Tree

When the app is running, components are nested like this:

```
App                               <- Creates state, wraps tree in Provider
+-- AppInner                      <- Activates hooks: useFullScreen, useKeyboardNavigation,
    |                                 useSearchFocusSync, useJobDetails
    +-- Layout                    <- Fullscreen flex container (column layout)
        +-- Header                <- Top bar
        |   +-- SearchBar         <- TextInput (when focused) or static label (when blurred)
        +-- Box (row, flex-grow)  <- Middle area -- horizontal split
        |   +-- FocusableBox      <- Filter drawer panel (only when filterDrawerOpen)
        |   |   +-- FilterDrawer  <- Scrollable filter sections
        |   |       +-- FilterSection + FilterCheckboxInput  (Job Type)
        |   |       +-- FilterSection + FilterCheckboxInput  (Experience Level)
        |   |       +-- FilterSection + FilterCheckboxInput  (Workplace Type)
        |   |       +-- FilterSection + FilterRadioInput     (Minimum Salary)
        |   |       +-- FilterSection + FilterRadioInput     (Listing Age)
        |   |       +-- FilterSection + FilterTextInput      (Location)
        |   |       +-- FilterSection + FilterTextInput      (Geo ID)
        |   |       +-- FilterSection + FilterTextInput      (Company ID)
        |   +-- FocusableBox      <- Results panel (always visible)
        |   |   +-- ContentArea   <- Routes based on searchStatus:
        |   |       +-- WelcomeScreen        (idle)
        |   |       +-- SearchingSpinner     (searching)
        |   |       +-- NoSearchResults      (results, but 0 items)
        |   |       +-- SearchResults        (results, items > 0)
        |   |       |   +-- ResultsHeader    <- "Showing X-Y of Z" + load duration banner
        |   |       |   +-- VirtualList      <- Only renders visible JobCards
        |   |       |   |   +-- JobCard      <- Repeated for each visible job
        |   |       |   +-- ResultsFooter    <- Load-more status / "no more jobs"
        |   |       +-- SearchError          (error)
        |   +-- FocusableBox      <- Job details panel (only when results exist)
        |       +-- JobDetailsPanel <- Scrollable detail view with markdown description
        +-- StatusBar             <- Bottom row with context-sensitive keyboard hints
```

Several components use `FocusableBox` — a thin wrapper around Ink's `<Box>` that reads whether its assigned panel is currently focused and automatically highlights its border in cyan when it is.

The `ContentArea` component acts like a router — it reads `searchStatus` and `totalResults` from state and renders the appropriate screen:

```ts
switch (searchStatus) {
  case 'idle':      return <WelcomeScreen />;
  case 'searching': return <SearchingSpinner />;
  case 'results':   return totalResults.length === 0
                      ? <NoSearchResults />
                      : <SearchResults />;
  case 'error':     return <SearchError message={...} />;
}
```

When `searchStatus` changes from `'idle'` to `'searching'`, React unmounts `WelcomeScreen` and mounts `SearchingSpinner` in its place. No manual screen clearing needed.

---

## How the App Starts

1. The user runs `jobby ui` on the command line.
2. Commander routes to `createUiCommand()` in `commands/ui.ts`.
3. The terminal switches to an **alternate screen buffer** (so the app doesn't overwrite your existing terminal content).
4. Ink's `render()` is called with the `App` component and options:
   - `patchConsole: true` — intercepts `console.log` so stray output doesn't break the layout.
   - `exitOnCtrlC: true` — Ctrl+C exits cleanly.
   - `incrementalRendering: true` — only redraws changed lines (prevents flickering).
5. React mounts the component tree:
   - `App` creates the state via `useReducer` and wraps everything in a context Provider.
   - `AppInner` calls `useFullScreen()` (starts listening for terminal resize), `useKeyboardNavigation()` (global key router), `useSearchFocusSync()` (auto-focuses results after search), and `useJobDetails()` (debounced detail fetcher).
   - `Layout` renders the three-section layout: header, middle row, status bar.
   - `ContentArea` sees `searchStatus === 'idle'` and renders `WelcomeScreen`.
6. Ink converts the React tree into terminal output and writes it to stdout.
7. The user sees: a search bar at top, "Press / to start searching" in the center, and keyboard hints at the bottom.

When the app exits, `waitUntilExit()` resolves, cleanup runs, and the original screen buffer is restored — your terminal looks exactly as it did before.

---

## Walkthroughs: When You Do X, React Does Y

### App Launch

```
Terminal                          React/State
-----------------------------------------------
You run `jobby ui`   ->   render(App) called
                          ->   State created: { searchStatus: 'idle', focusedPanel: null, ... }
                          ->   Component tree built
                          ->   ContentArea sees 'idle' -> renders WelcomeScreen
                          ->   Ink writes to terminal
You see the welcome screen   <-   Done
```

### Pressing `/` to Focus the Search Bar

```
Terminal                          React/State
-----------------------------------------------
You press `/`        ->   useKeyboardNavigation catches it
                          ->   dispatch({ type: 'FOCUS_PANEL', panel: 'search' })
                          ->   Reducer returns new state: { focusedPanel: 'search', ... }
                          ->   React re-renders components that read focusedPanel:
                              - SearchBar: usePanelFocus('search') -> true -> mounts TextInput
                              - FocusableBox panels: borders update (search = cyan, others = gray)
                              - StatusBar: hints update to [Type]:Keyword [Enter]:Search [Esc]:Cancel
Cursor appears in search bar   <-   Done. Keystrokes now go to TextInput.
```

The key detail: `useKeyboardNavigation` only handles `\` and `/` when `focusedPanel` is not `'search'` or `'filters'`, preventing those characters from leaking into text inputs. Each panel's own keyboard hook uses `{ isActive: panelFocused }` to self-activate or self-deactivate.

### Typing a Keyword and Pressing Enter

```
Terminal                          React/State
-----------------------------------------------
You type "TypeScript"  ->   TextInput handles each keystroke internally
                              (updates its own internal cursor/text; no global dispatches)

You press Enter        ->   SearchBar's onSubmit fires with "TypeScript"
                          ->   dispatch({ type: 'BLUR_ALL' })
                          ->   dispatch({ type: 'SET_SEARCH_KEYWORD', keyword: 'TypeScript' })
                          ->   search('TypeScript', currentFilters) called:
                              1. dispatch({ type: 'SEARCH_START' })
                                 -> searchStatus: 'searching', clears errors and job details
                                 -> ContentArea switches to SearchingSpinner
                              2. client.jobs.queryForJobs(params) called
                                 (async -- spinner stays visible while waiting)

Spinner appears        <-   React re-rendered with searchStatus: 'searching'

                          ... time passes, API responds ...

                          ->   dispatch({ type: 'SEARCH_SUCCESS', results, pagination, ... })
                          ->   State: { searchStatus: 'results', totalResults: [...], selectedJobIndex: 0 }
                          ->   useSearchFocusSync detects the 'searching' -> 'results' transition
                          ->   dispatch({ type: 'FOCUS_PANEL', panel: 'results' })
                          ->   ContentArea switches to SearchResults
                          ->   VirtualList renders visible JobCards
                          ->   useJobDetails fires for the first job (after 300ms debounce)

Results appear         <-   Done. First card highlighted, details panel begins loading.
```

Note the async gap. After `SEARCH_START`, React re-renders (showing the spinner), then JavaScript yields control. When the HTTP response arrives, the `.then()` callback dispatches `SEARCH_SUCCESS`, and React re-renders again (showing results). The component code never "waits" — it just responds to state changes.

If the API call fails:

```
                          ->   .catch() fires
                          ->   dispatch({ type: 'SEARCH_ERROR', error: 'Network timeout' })
                          ->   ContentArea switches to SearchError
Error message appears  <-   Done
```

### Scrolling Through Results with Arrow Keys

```
Terminal                          React/State
-----------------------------------------------
You press down arrow ->   useResultsKeyboard catches it (isActive: results panel focused)
                          ->   dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: 1 })
                          ->   State: { selectedJobIndex: 1 }
                          ->   SearchResults re-renders, passes selectedIndex=1 to VirtualList
                          ->   VirtualList checks if index 1 is visible:
                              - If yes: just updates which card gets focused=true
                              - If no: scrolls the viewport to bring index 1 into view
                          ->   ResultsHeader updates "Showing 2-8 of 25"
                          ->   useJobDetails effect fires (debounced 300ms): fetches new job details

Next card highlighted  <-   Done

You press down at end ->   isOnLastItem is true
of the list               ->   loadMore() called
                          ->   dispatch({ type: 'LOAD_MORE_START' })
                          ->   ResultsFooter shows "Fetching more jobs..."
                          ->   HTTP request fires for next page
                          ->   dispatch({ type: 'LOAD_MORE_SUCCESS', results: [...] })
                          ->   totalResults grows, VirtualList scrolls forward

More jobs appear       <-   Done
```

The `VirtualList` component from `ink-virtual-list` handles all scroll math internally. It only renders the `JobCard` components that are currently visible in the terminal viewport — if you have 100 results but only 6 fit on screen, only 6 `JobCard` components exist at any time.

### Pressing Enter on a Job to Open Details

```
Terminal                          React/State
-----------------------------------------------
You press Enter      ->   useResultsKeyboard catches it
(on a job listing)        ->   dispatch({ type: 'FOCUS_PANEL', panel: 'details' })
                          ->   focusedPanel: 'details'
                          ->   FocusableBox (details): border -> cyan
                          ->   FocusableBox (results): border -> gray
                          ->   StatusBar: hints update to [up/down]:Scroll [PgUp/PgDn]:Page [Esc]:Back
                          ->   useDetailsKeyboard activates (isActive: true)
                          ->   JobDetailsPanel is already visible and already loading/showing
                              details from useJobDetails

Details panel focused  <-   Done. Arrow keys now scroll the details view.
```

The details panel is always rendered side-by-side with the results panel whenever `searchStatus === 'results'` and `totalResults.length > 0`. Pressing Enter just shifts keyboard focus to it. `useJobDetails` automatically begins fetching details for whichever job is selected — with a 300ms debounce so that rapidly scrolling through results doesn't flood the API.

### Opening the Filter Drawer

```
Terminal                          React/State
-----------------------------------------------
You press `\`        ->   useKeyboardNavigation catches it (only when not in text input)
                          ->   dispatch({ type: 'OPEN_FILTER_DRAWER' })
                          ->   dispatch({ type: 'FOCUS_PANEL', panel: 'filters' })
                          ->   filterDrawerOpen: true, focusedPanel: 'filters'
                          ->   Layout renders FilterDrawer on the left
                          ->   useFilterDraft resets draft state to current applied filters
                          ->   useFilterKeyboard activates (isActive: filters panel focused)

Filter drawer appears  <-   Done

You navigate with      ->   useFilterKeyboard dispatches NAVIGATE_FILTERS to the local
up/down, press Space        filterDrawerReducer (not the global reducer)
to toggle                   ->   FilterDrawer re-renders with updated cursor / selections
                              (changes are local draft only -- not yet applied to app state)

You press Enter        ->   useFilterKeyboard fires:
                          ->   dispatch({ type: 'APPLY_FILTERS', filters: draftSelections })
                          ->   dispatch({ type: 'CLOSE_FILTER_DRAWER' })
                          ->   search(currentKeyword, draftSelections) fires a new search

Filter drawer closes,  <-   Done. New search runs with the selected filters.
new results load
```

The filter drawer uses a **two-layer state pattern**: draft state lives in a local `useReducer` inside `FilterDrawer` (via `useFilterDraft`), completely separate from the global reducer. Changes inside the drawer don't affect the rest of the app until you press Enter to confirm. The draft is reset to the currently-applied filters every time the drawer opens.

### Pressing Escape from the Search Bar

```
Terminal                          React/State
-----------------------------------------------
You press Escape     ->   SearchBar's useInput catches it (isActive: search focused)
(while in search bar)     ->   If totalResults.length > 0:
                              dispatch({ type: 'FOCUS_PANEL', panel: 'results' })
                          ->   Else:
                              dispatch({ type: 'BLUR_ALL' })
                          ->   SearchBar switches from TextInput to static label
                          ->   FocusableBox borders update
                          ->   StatusBar updates hints

Search bar unfocused  <-   Results (if any) remain, focus returns to them
```

### Pressing Escape from Results

```
Terminal                          React/State
-----------------------------------------------
You press Escape     ->   useResultsKeyboard catches it (isActive: results focused)
(while browsing           ->   dispatch({ type: 'CLEAR_RESULTS' })
results)                  ->   dispatch({ type: 'BLUR_ALL' })
                          ->   Reducer resets: searchStatus -> 'idle', totalResults -> [],
                              searchResults -> [], pagination/metadata/query/error -> undefined,
                              selectedJobIndex -> 0, loadMoreStatus -> 'idle',
                              jobDetails -> null, jobDetailsStatus -> 'idle'
                          ->   focusedPanel -> null
                          ->   ContentArea sees 'idle' -> renders WelcomeScreen
                          ->   JobDetailsPanel unmounts (showDetailsPanel is now false)
                          ->   StatusBar updates hints

Back to welcome screen  <-   Done. Previous search keyword is still remembered in state.
```

### Resizing the Terminal Window

```
Terminal                          React/State
-----------------------------------------------
You resize terminal  ->   OS fires 'resize' event on process.stdout
                          ->   useFullScreen's listener fires
                          ->   dispatch({ type: 'SET_TERMINAL_SIZE', width: 150, height: 50 })
                          ->   State: { terminalWidth: 150, terminalHeight: 50, maxWidth: 150, maxHeight: 50 }
                          ->   Layout re-renders with new dimensions
                          ->   If showing results, VirtualList recalculates visible card count
                          ->   useContainerHeight re-measures heights in JobDetailsPanel / SearchResults
                          ->   StatusBar updates [150x50]

UI reflows to new size  <-   Done
```

### Pressing Ctrl+C to Quit

```
Terminal                          React/State
-----------------------------------------------
You press Ctrl+C     ->   Ink's exitOnCtrlC handler fires exit()
                          ->   Ink unmounts the component tree
                          ->   useFullScreen cleanup removes resize listener
                          ->   Any in-flight AbortControllers are cancelled
                          ->   waitUntilExit() resolves in ui.ts
                          ->   cleanup() called, restoreScreenBuffer() swaps back

Original terminal restored  <-   Done
```

---

## Data Flow Diagram

```
+---------------------------------------------------------------------+
|                         User Input                                  |
|         (keypress, terminal resize, text input, Ctrl+C)             |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
|                          Hooks Layer                                |
|                                                                     |
|  useKeyboardNavigation   useFullScreen      SearchBar's useInput    |
|  (\, /, Esc routing)     (resize)           (Esc, TextInput keys)  |
|                                                                     |
|  useResultsKeyboard      useDetailsKeyboard  useFilterKeyboard      |
|  (arrows PgUp/Dn        (arrows PgUp/Dn     (arrows Tab Space     |
|   Enter Esc)              Home/End)           Enter)                |
+----------+-----------------------------------------+----------------+
           | dispatch(action) -- global               | draftDispatch(action)
           |                                          | -- local filter draft
           v                                          v
+--------------------------+         +-------------------------------+
|      appReducer          |         |    filterDrawerReducer        |
|  (global app state)      |         |  (local draft in FilterDrawer)|
|                          |         |                               |
|  SET_TERMINAL_SIZE       |         |  NAVIGATE_FILTERS             |
|  FOCUS_PANEL / BLUR_ALL  |         |  SET_FILTERS                  |
|  SET_SEARCH_KEYWORD      |         |  RESET_FILTERS                |
|  SEARCH_START/SUCCESS    |         +-------------------------------+
|  SEARCH_ERROR            |               (only applied to global
|  SET_SELECTED_JOB_INDEX  |                state when Enter pressed)
|  CLEAR_RESULTS           |
|  LOAD_MORE_START/SUCCESS |
|  LOAD_MORE_ERROR         |
|  OPEN/CLOSE_FILTER_DRAWER|
|  APPLY_FILTERS           |
|  JOB_DETAILS_START       |
|  JOB_DETAILS_SUCCESS     |
|  JOB_DETAILS_ERROR       |
|  CLEAR_JOB_DETAILS       |
+------------+-------------+
             | new state
             v
+---------------------------------------------------------------------+
|                     React Reconciliation                            |
|                                                                     |
|  Compares old component output vs new component output.             |
|  Determines the minimal set of terminal cells to update.            |
+----------------------------+----------------------------------------+
                             |
                             v
+---------------------------------------------------------------------+
|                      Ink Renderer                                   |
|                                                                     |
|  Converts React's <Box>/<Text> elements into ANSI escape codes      |
|  and writes them to process.stdout.                                 |
|  With incrementalRendering, only changed lines are rewritten.       |
+---------------------------------------------------------------------+
```

There are two important async exceptions to this synchronous loop:

1. **Search / load-more**: `useSearch` dispatches `SEARCH_START` synchronously (triggering the spinner re-render), then makes an HTTP request. When the response arrives, `.then()` dispatches `SEARCH_SUCCESS`. An `AbortController` cancels in-flight requests if a new search starts before the old one finishes.

2. **Job details**: `useJobDetails` watches `selectedJobIndex` via a `useEffect`. When the selection changes it first dispatches `CLEAR_JOB_DETAILS`, then sets a 300ms debounce timer before dispatching `JOB_DETAILS_START` and making the HTTP request. Navigating away during that window cancels both the timer and any in-flight request.

---

## File Reference

| File | Role |
|---|---|
| `commands/ui.ts` | Entry point — mounts Ink app, manages screen buffers |
| `ui/App.tsx` | Root component — creates state, provides context, mounts `AppInner` |
| `ui/constants.ts` | Numeric constants: drawer width, debounce delays, reserved lines |
| `ui/theme.ts` | Colors, border helpers, icon emoji map, glyph characters |
| **State** | |
| `ui/state/types.ts` | TypeScript types for `AppState`, `AppAction`, `PanelId`, status enums |
| `ui/state/reducer.ts` | `appReducer` function and `initialState` |
| `ui/state/context.ts` | React context + `useAppState` / `useAppDispatch` / `useFocusedPanel` helpers |
| `ui/state/filterTypes.ts` | `SearchFilters` type, `FilterSectionDef`, section order, `countActiveFilters` |
| `ui/state/filterReducer.ts` | `filterDrawerReducer` for local draft state inside the filter drawer |
| `ui/state/filterHelpers.ts` | `toggleCheckboxOption`, `toggleRadioOption`, `getSelected`, `getTextValue` |
| **Utils** | |
| `ui/utils/buildSearchParams.ts` | Converts keyword + `SearchFilters` into `JobSearchParams` for the client |
| **Hooks** | |
| `ui/hooks/useFullScreen.ts` | Dispatches `SET_TERMINAL_SIZE` on `process.stdout` resize events |
| `ui/hooks/useKeyboardNavigation.ts` | Global keyboard router: `\` (filters), `/` (search), `Escape` from details/filters |
| `ui/hooks/useSearchFocusSync.ts` | Auto-focuses results panel on search completion |
| `ui/hooks/useJobDetails.ts` | Debounced job details fetcher — watches `selectedJobIndex`, cancels stale requests |
| `ui/hooks/usePanelFocus.ts` | Returns `true` if a given `PanelId` currently owns focus |
| `ui/hooks/useSearch.ts` | Fires the initial search and exposes `loadMore` for pagination |
| `ui/hooks/useResultsKeyboard.ts` | Arrow/Page/Home/End navigation, Enter (open details), Escape (clear results) |
| `ui/hooks/useDetailsKeyboard.ts` | Arrow/Page/Home/End scrolling inside the job details panel |
| `ui/hooks/useFilterKeyboard.ts` | Navigation and selection logic inside the filter drawer |
| `ui/hooks/useFilterDraft.ts` | Manages filter drawer local draft state; resets draft on each open |
| `ui/hooks/useContainerHeight.ts` | Measures a DOM element's height after render for scroll limit calculation |
| `ui/hooks/useTimedVisibility.ts` | Returns `true` for a fixed duration after a trigger value appears |
| **Components** | |
| `ui/components/Layout.tsx` | Fullscreen column layout: header, horizontal middle row, status bar |
| `ui/components/FocusableBox.tsx` | `<Box>` wrapper that highlights border cyan when its panel is focused |
| `ui/components/Header.tsx` | Top bar wrapper containing `SearchBar` |
| `ui/components/SearchBar.tsx` | Mounts `TextInput` when focused, shows static label otherwise |
| `ui/components/ContentArea.tsx` | Routes to one of five screens based on `searchStatus` / `totalResults` |
| `ui/components/WelcomeScreen.tsx` | Initial idle screen |
| `ui/components/SearchingSpinner.tsx` | Centered spinner while search is in progress |
| `ui/components/SearchResults.tsx` | Virtual-scrolling results list with header and footer |
| `ui/components/ResultsHeader.tsx` | "Showing X-Y of Z" info bar and timed load-duration banner |
| `ui/components/ResultsFooter.tsx` | Load-more status: fetching / exhausted / error / prompt |
| `ui/components/JobCard.tsx` | Compact bordered card for a single job listing |
| `ui/components/NoSearchResults.tsx` | Shown when search returns 0 results |
| `ui/components/SearchError.tsx` | Error display with retry hint |
| `ui/components/JobDetailsPanel.tsx` | Scrollable split-panel showing job metadata and markdown description |
| `ui/components/FilterDrawer.tsx` | Scrollable filter panel with all filter sections |
| `ui/components/FilterSection.tsx` | Layout wrapper for one filter section (title + input) |
| `ui/components/FilterCheckboxInput.tsx` | Multi-select checkbox option list |
| `ui/components/FilterRadioInput.tsx` | Single-select radio option list |
| `ui/components/FilterTextInput.tsx` | Free-form text input for location / geoId / companyId filters |
| `ui/components/StatusBar.tsx` | Bottom row with context-sensitive keyboard hints |
