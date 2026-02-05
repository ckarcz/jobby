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
  - [Pressing Escape from the Search Bar](#pressing-escape-from-the-search-bar)
  - [Pressing Escape from Results](#pressing-escape-from-results)
  - [Resizing the Terminal Window](#resizing-the-terminal-window)
  - [Pressing `q` to Quit](#pressing-q-to-quit)
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
  terminalWidth: 120,        // current terminal dimensions
  terminalHeight: 40,
  maxWidth: 119,             // usable area (terminal minus 1)
  maxHeight: 39,
  searchFocused: false,      // is the cursor in the search bar?
  searchKeyword: '',         // what the user last searched for
  searchStatus: 'idle',      // 'idle' | 'searching' | 'results' | 'error'
  searchResults: [],         // array of job objects from LinkedIn
  searchPagination: undefined,
  searchMetadata: undefined,
  searchQuery: undefined,
  searchError: undefined,
  selectedJobIndex: 0,       // which job card is highlighted
}
```

This is the single source of truth. Every component reads from this object to decide what to render. Nothing is stored in random variables scattered around the code — it's all here.

### Actions and the Reducer

You never modify state directly. Instead, you create an **action** — a small object describing what happened:

```ts
{ type: 'SET_SEARCH_FOCUSED', focused: true }
{ type: 'SEARCH_START' }
{ type: 'SET_SELECTED_JOB_INDEX', index: 3 }
```

The **reducer** is a pure function that takes the current state and an action, and returns a brand new state object:

```ts
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SEARCH_FOCUSED':
      return { ...state, searchFocused: action.focused };
    case 'SEARCH_START':
      return { ...state, searchStatus: 'searching', searchError: undefined };
    // ... other cases
  }
}
```

The `{ ...state, searchFocused: action.focused }` syntax means "copy everything from the old state, but override `searchFocused` with the new value." The old state is never mutated — a fresh object is always returned.

This pattern has a major benefit: every state transition is explicit and traceable. If you want to know what happens when a search succeeds, you look at the `SEARCH_SUCCESS` case in the reducer. There's no hidden logic.

Here are all the actions the app can dispatch:

| Action | When It Fires | What It Changes |
|---|---|---|
| `SET_TERMINAL_SIZE` | Terminal window is resized | `terminalWidth`, `terminalHeight`, `maxWidth`, `maxHeight` |
| `SET_SEARCH_FOCUSED` | User presses `/` or `Escape` | `searchFocused` |
| `SET_SEARCH_KEYWORD` | User submits a search | `searchKeyword` |
| `SEARCH_START` | Search API call begins | `searchStatus` → `'searching'`, clears error |
| `SEARCH_SUCCESS` | API returns results | `searchStatus` → `'results'`, fills `searchResults`, `searchPagination`, `searchMetadata`, `searchQuery`, resets `selectedJobIndex` to 0 |
| `SEARCH_ERROR` | API call fails | `searchStatus` → `'error'`, sets `searchError` |
| `SET_SELECTED_JOB_INDEX` | User presses arrow keys | `selectedJobIndex` |
| `CLEAR_RESULTS` | User presses `Escape` on results | Resets everything search-related back to idle |

### Context

React components form a tree (parent → children → grandchildren). **Context** is React's mechanism for sharing data across the entire tree without passing it through every intermediate component as a parameter.

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
const { searchResults, selectedJobIndex } = useAppState();   // read state
const dispatch = useAppDispatch();                            // send actions
dispatch({ type: 'SET_SEARCH_FOCUSED', focused: true });
```

### Hooks

**Hooks** are functions that let components "hook into" React features. They always start with `use`. This app uses several:

| Hook | What It Does |
|---|---|
| `useReducer` | Creates the state + dispatch pair. This is React's built-in state management for complex state. |
| `useState` | Creates a simple local state variable (used in `SearchResults` for viewport tracking). |
| `useContext` | Reads from the shared context (wrapped by `useAppState` / `useAppDispatch` helpers). |
| `useCallback` | Memoizes a function so it doesn't get recreated on every render. |
| `useEffect` | Runs side effects (things that interact with the outside world — see below). |
| `useInput` | Ink-specific hook that registers a keyboard handler. |
| `useApp` | Ink-specific hook that gives access to app-level controls like `exit()`. |

### Effects

Most of React is "pure" — given the same state, the same output is produced. But some things are inherently impure: making API calls, listening for terminal resize events, etc. These are called **side effects**, and React handles them with the `useEffect` hook.

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

The pattern is: set up → return cleanup. React guarantees the cleanup runs before the effect re-runs or when the component is destroyed.

---

## The Component Tree

When the app is running, components are nested like this:

```
App                          ← Creates state, wraps tree in Provider
└── AppInner                 ← Activates hooks (resize tracking, keyboard navigation)
    └── Layout               ← Full-screen flex container (column layout)
        ├── Header           ← Top row
        │   └── SearchBar    ← Text input or static label
        ├── Box (border)     ← Bordered content area (flex-grow fills remaining space)
        │   └── ContentArea  ← Routes to one of four screens based on searchStatus:
        │       ├── WelcomeScreen      (when idle)
        │       ├── SearchingSpinner   (when searching)
        │       ├── SearchResults      (when results)
        │       │   └── VirtualList    ← Only renders visible JobCards
        │       │       └── JobCard    ← Repeated for each visible job
        │       └── SearchError        (when error)
        └── StatusBar        ← Bottom row with keyboard hints
```

The `ContentArea` component acts like a router — it reads `searchStatus` from state and renders the appropriate screen:

```ts
switch (searchStatus) {
  case 'idle':      return <WelcomeScreen />;
  case 'searching': return <SearchingSpinner />;
  case 'results':   return <SearchResults />;
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
   - `AppInner` calls `useFullScreen()` (starts listening for terminal resize) and `useKeyboardNavigation()` (starts listening for key presses).
   - `Layout` renders the three-row layout.
   - `ContentArea` sees `searchStatus === 'idle'` and renders `WelcomeScreen`.
6. Ink converts the React tree into terminal output and writes it to stdout.
7. The user sees: a search bar at top, "Press / to start searching" in the center, and keyboard hints at the bottom.

When the app exits, `waitUntilExit()` resolves, cleanup runs, and the original screen buffer is restored — your terminal looks exactly as it did before.

---

## Walkthroughs: When You Do X, React Does Y

### App Launch

```
Terminal                          React/State
───────────────────────────────────────────────
You run `jobby ui`   →   render(App) called
                              →   State created: { searchStatus: 'idle', ... }
                              →   Component tree built
                              →   ContentArea sees 'idle' → renders WelcomeScreen
                              →   Ink writes to terminal
You see the welcome screen   ←   Done
```

### Pressing `/` to Focus the Search Bar

```
Terminal                          React/State
───────────────────────────────────────────────
You press `/`                →   useKeyboardNavigation catches it
                              →   dispatch({ type: 'SET_SEARCH_FOCUSED', focused: true })
                              →   Reducer returns new state: { searchFocused: true, ... }
                              →   React re-renders components that read searchFocused:
                                  • SearchBar switches from static text to TextInput
                                  • Layout changes border color to cyan (focused)
                                  • StatusBar updates hints to show [Enter]:Search
                                  • useKeyboardNavigation deactivates (isActive: false)
Cursor appears in search bar ←   Done. Keystrokes now go to TextInput.
```

The key detail: `useKeyboardNavigation` has `{ isActive: !state.searchFocused }`. When `searchFocused` becomes `true`, this hook stops processing keys. The `TextInput` component has its own `useInput` that takes over.

### Typing a Keyword and Pressing Enter

```
Terminal                          React/State
───────────────────────────────────────────────
You type "TypeScript"        →   TextInput handles each keystroke internally
                                  (no state dispatches — just local cursor/text tracking)

You press Enter              →   TextInput's onSubmit fires with "TypeScript"
                              →   dispatch({ type: 'SET_SEARCH_FOCUSED', focused: false })
                              →   dispatch({ type: 'SET_SEARCH_KEYWORD', keyword: 'TypeScript' })
                              →   useSearch callback fires:
                                  1. dispatch({ type: 'SEARCH_START' })
                                     → State: { searchStatus: 'searching', ... }
                                     → ContentArea switches to SearchingSpinner
                                  2. Creates JobbyClient, calls queryForJobs()
                                     (this is async — the spinner stays visible while waiting)

Spinner appears              ←   React re-rendered with searchStatus: 'searching'

                              ... time passes, API responds ...

                              →   .then() fires with job results
                              →   dispatch({ type: 'SEARCH_SUCCESS', results: [...], ... })
                              →   State: { searchStatus: 'results', searchResults: [...], selectedJobIndex: 0 }
                              →   ContentArea switches to SearchResults
                              →   VirtualList renders only the visible JobCards
                              →   First card is highlighted (selectedJobIndex: 0)
                              →   useKeyboardNavigation reactivates (searchFocused is false)

Results appear               ←   Done
```

Note the async gap. After `SEARCH_START`, React re-renders (showing the spinner), then JavaScript yields control. When the HTTP response arrives, the `.then()` callback dispatches `SEARCH_SUCCESS`, and React re-renders again (showing results). The component code never "waits" — it just responds to state changes.

If the API call fails:

```
                              →   .catch() fires
                              →   dispatch({ type: 'SEARCH_ERROR', error: 'Network timeout' })
                              →   ContentArea switches to SearchError
Error message appears        ←   Done
```

### Scrolling Through Results with Arrow Keys

```
Terminal                          React/State
───────────────────────────────────────────────
You press ↓                  →   useKeyboardNavigation catches it
                              →   dispatch({ type: 'SET_SELECTED_JOB_INDEX', index: 1 })
                              →   State: { selectedJobIndex: 1 }
                              →   SearchResults re-renders, passes selectedIndex=1 to VirtualList
                              →   VirtualList checks if index 1 is visible:
                                  • If yes: just updates which card gets focused=true
                                  • If no: scrolls the viewport to bring index 1 into view
                              →   VirtualList calls onViewportChange with new offset
                              →   Summary line updates "Showing 2–8 of 25"
                              →   StatusBar updates "2/25"

Next card highlighted        ←   Done

You press ↑                  →   Same flow, but index decreases
```

The `VirtualList` component from `ink-virtual-list` handles all scroll math internally. It only renders the `JobCard` components that are currently visible in the terminal viewport — if you have 100 results but only 6 fit on screen, only 6 `JobCard` components exist at any time. As you scroll, old cards are destroyed and new ones are created.

### Pressing Escape from the Search Bar

```
Terminal                          React/State
───────────────────────────────────────────────
You press Escape             →   SearchBar's useInput catches it (isActive: searchFocused)
(while typing in search bar)  →   dispatch({ type: 'SET_SEARCH_FOCUSED', focused: false })
                              →   State: { searchFocused: false }
                              →   SearchBar switches from TextInput to static text
                              →   Layout border changes back
                              →   useKeyboardNavigation reactivates
                              →   StatusBar updates hints

Search bar unfocused         ←   Results (if any) are still there, focus returns to them
```

### Pressing Escape from Results

```
Terminal                          React/State
───────────────────────────────────────────────
You press Escape             →   useKeyboardNavigation catches it
(while browsing results)      →   Checks searchStatus === 'results' → yes
                              →   dispatch({ type: 'CLEAR_RESULTS' })
                              →   Reducer resets: searchStatus → 'idle', searchResults → [],
                                  clears pagination/metadata/query/error, selectedJobIndex → 0
                              →   ContentArea sees 'idle' → renders WelcomeScreen
                              →   StatusBar updates hints

Back to welcome screen       ←   Done. Previous search keyword is still remembered.
```

### Resizing the Terminal Window

```
Terminal                          React/State
───────────────────────────────────────────────
You resize the terminal      →   OS fires 'resize' event on process.stdout
                              →   useFullScreen's event listener fires
                              →   dispatch({ type: 'SET_TERMINAL_SIZE', width: 150, height: 50 })
                              →   State: { terminalWidth: 150, terminalHeight: 50, maxWidth: 149, maxHeight: 49 }
                              →   Layout re-renders with new dimensions
                              →   If showing results, VirtualList recalculates how many cards fit
                              →   StatusBar updates dimension display [150x50]

UI reflows to new size       ←   Done
```

### Pressing `q` to Quit

```
Terminal                          React/State
───────────────────────────────────────────────
You press q                  →   useKeyboardNavigation catches it
                              →   exit() called (from Ink's useApp hook)
                              →   Ink unmounts the component tree
                              →   useFullScreen cleanup removes resize listener
                              →   waitUntilExit() resolves in ui.ts
                              →   restoreScreenBuffer() swaps back to original terminal

Original terminal restored   ←   Done
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Input                                  │
│                  (keypress, terminal resize)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Hooks                                      │
│                                                                     │
│  useKeyboardNavigation    useFullScreen    SearchBar's useInput      │
│  (/, q, ↑, ↓, Esc)       (resize)        (Esc, TextInput keys)     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ dispatch(action)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Reducer                                      │
│                                                                     │
│  (currentState, action) → newState                                  │
│                                                                     │
│  SET_TERMINAL_SIZE  |  SET_SEARCH_FOCUSED  |  SET_SEARCH_KEYWORD    │
│  SEARCH_START       |  SEARCH_SUCCESS      |  SEARCH_ERROR          │
│  SET_SELECTED_JOB_INDEX  |  CLEAR_RESULTS                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ new state
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     React Reconciliation                            │
│                                                                     │
│  Compares old component output vs new component output.             │
│  Determines the minimal set of terminal cells to update.            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Ink Renderer                                   │
│                                                                     │
│  Converts React's <Box>/<Text> elements into ANSI escape codes      │
│  and writes them to process.stdout.                                 │
│  With incrementalRendering, only changed lines are rewritten.       │
└─────────────────────────────────────────────────────────────────────┘
```

The async search call is the one exception to the synchronous loop above. When `useSearch` fires, it dispatches `SEARCH_START` synchronously (triggering a re-render to show the spinner), then makes an HTTP request. When the response arrives later, `.then()` dispatches `SEARCH_SUCCESS` (triggering another re-render to show results).

---

## File Reference

| File | Role |
|---|---|
| `commands/ui.ts` | Entry point — mounts Ink app, manages screen buffers |
| `ui/App.tsx` | Root component — creates state, provides context |
| `ui/state/types.ts` | TypeScript types for state and actions |
| `ui/state/reducer.ts` | Reducer function and initial state |
| `ui/state/context.ts` | React context + `useAppState`/`useAppDispatch` helpers |
| `ui/hooks/useFullScreen.ts` | Terminal resize tracking (effect) |
| `ui/hooks/useKeyboardNavigation.ts` | Global keyboard handler when not in search bar |
| `ui/hooks/useSearch.ts` | Async LinkedIn API call logic |
| `ui/components/Layout.tsx` | Three-row flexbox layout |
| `ui/components/Header.tsx` | Top bar wrapper |
| `ui/components/SearchBar.tsx` | Text input with focus/blur states + Escape handling |
| `ui/components/ContentArea.tsx` | Routes to screen based on `searchStatus` |
| `ui/components/WelcomeScreen.tsx` | Initial idle screen |
| `ui/components/SearchingSpinner.tsx` | Loading spinner |
| `ui/components/SearchResults.tsx` | Virtual-scrolling results list |
| `ui/components/JobCard.tsx` | Single job listing card |
| `ui/components/SearchError.tsx` | Error display |
| `ui/components/StatusBar.tsx` | Bottom keyboard hints |
| `ui/theme.ts` | Colors, icons, and glyphs |
