import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Note, EditorSettings } from './types';
import { 
  loadNotes, 
  saveNotes, 
  loadActiveNoteId, 
  saveActiveNoteId, 
  loadSettings, 
  saveSettings, 
  calculateStats, 
  downloadFile, 
  copyToClipboard 
} from './utils/storage';
import { 
  subscribeToUserNotes, 
  saveNoteToFirestore, 
  deleteNoteFromFirestore, 
  syncLocalNotesToFirestore 
} from './firebase/notesService';
import { RotateCcw } from 'lucide-react';

function NotepadApp() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => loadActiveNoteId(notes));
  const [settings, setSettings] = useState<EditorSettings>(() => loadSettings());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [deletedNoteUndo, setDeletedNoteUndo] = useState<Note | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active note lookup
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0] || null;
  }, [notes, activeNoteId]);

  // Handle Firebase cloud sync when user logs in/out
  useEffect(() => {
    if (!user) {
      // Logged out: load from local storage
      const local = loadNotes();
      setNotes(local);
      if (local.length > 0) {
        setActiveNoteId(local[0].id);
      }
      return;
    }

    setSaveStatus('saving');
    let isFirstBatch = true;

    // Realtime Firestore subscription
    const unsubscribe = subscribeToUserNotes(
      user.uid,
      async (cloudNotes) => {
        setSaveStatus('saved');
        if (isFirstBatch) {
          isFirstBatch = false;
          // If cloud has no notes yet, sync existing local notes to the cloud
          const local = loadNotes();
          if (cloudNotes.length === 0 && local.length > 0) {
            await syncLocalNotesToFirestore(user.uid, local);
            return;
          }
        }

        if (cloudNotes.length > 0) {
          setNotes(cloudNotes);
          // Preserve active note if possible
          setActiveNoteId((current) => {
            if (cloudNotes.some((n) => n.id === current)) {
              return current;
            }
            return cloudNotes[0].id;
          });
        } else {
          // If completely empty, create an initial cloud note
          const welcomeNote: Note = {
            id: 'note-' + Date.now(),
            userId: user.uid,
            title: 'Welcome to Cloud Notepad',
            content: '# Welcome to Cloud Notepad!\n\nYour notes are now automatically backed up and synced using Firebase Firestore.\n\n### Features:\n- ⚡ Real-time automatic cloud sync\n- 🔒 Private & secure per-user storage\n- 📝 Rich Markdown editing\n- 🎨 Themes, paper styles, and focus mode\n- 📊 Statistics & word counter',
            isPinned: true,
            category: 'General',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setNotes([welcomeNote]);
          setActiveNoteId(welcomeNote.id);
          saveNoteToFirestore(user.uid, welcomeNote);
        }
      },
      (err) => {
        console.warn('Firestore subscription error:', err);
        setSaveStatus('saved');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Persist notes to localStorage as backup/offline cache
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // Persist active note ID
  useEffect(() => {
    if (activeNote?.id) {
      saveActiveNoteId(activeNote.id);
    }
  }, [activeNote?.id]);

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Note Stats
  const stats = useMemo(() => {
    return calculateStats(activeNote?.content || '');
  }, [activeNote?.content]);

  // Create new note
  const handleNewNote = useCallback(() => {
    const newNote: Note = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId: user?.uid,
      title: '',
      content: '',
      isPinned: false,
      category: 'General',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);

    if (user) {
      saveNoteToFirestore(user.uid, newNote);
    }
    setSaveStatus('saved');
  }, [user]);

  // Update note with debounced Firestore save
  const handleUpdateNote = useCallback((updatedFields: Partial<Note>) => {
    if (!activeNote) return;

    setSaveStatus('saving');

    const updatedNote: Note = {
      ...activeNote,
      ...updatedFields,
      updatedAt: Date.now(),
    };

    // Immediate local update
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n.id === activeNote.id ? updatedNote : n))
    );

    // Debounced cloud save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (user) {
        try {
          await saveNoteToFirestore(user.uid, updatedNote);
        } catch (e) {
          console.error('Failed to save to Firestore:', e);
        }
      }
      setSaveStatus('saved');
    }, 400);
  }, [activeNote, user]);

  // Delete note
  const handleDeleteNote = useCallback((idToDelete: string) => {
    const noteToDelete = notes.find((n) => n.id === idToDelete);
    if (!noteToDelete) return;

    setDeletedNoteUndo(noteToDelete);
    const remaining = notes.filter((n) => n.id !== idToDelete);
    setNotes(remaining);

    if (user) {
      deleteNoteFromFirestore(user.uid, idToDelete).catch((e) => {
        console.error('Failed to delete from Firestore:', e);
      });
    }

    if (activeNoteId === idToDelete) {
      if (remaining.length > 0) {
        setActiveNoteId(remaining[0].id);
      } else {
        const freshNote: Note = {
          id: 'note-' + Date.now(),
          userId: user?.uid,
          title: '',
          content: '',
          isPinned: false,
          category: 'General',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setNotes([freshNote]);
        setActiveNoteId(freshNote.id);
        if (user) {
          saveNoteToFirestore(user.uid, freshNote);
        }
      }
    }

    // Auto dismiss undo banner after 6 seconds
    setTimeout(() => {
      setDeletedNoteUndo((curr) => (curr?.id === idToDelete ? null : curr));
    }, 6000);
  }, [notes, activeNoteId, user]);

  // Undo delete
  const handleUndoDelete = useCallback(() => {
    if (!deletedNoteUndo) return;
    setNotes((prev) => [deletedNoteUndo, ...prev]);
    setActiveNoteId(deletedNoteUndo.id);
    if (user) {
      saveNoteToFirestore(user.uid, deletedNoteUndo);
    }
    setDeletedNoteUndo(null);
  }, [deletedNoteUndo, user]);

  // Duplicate note
  const handleDuplicateNote = useCallback((idToDuplicate: string) => {
    const target = notes.find((n) => n.id === idToDuplicate);
    if (!target) return;

    const duplicate: Note = {
      ...target,
      id: 'note-' + Date.now(),
      userId: user?.uid,
      title: target.title ? `${target.title} (Copy)` : 'Copy of Note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes((prev) => [duplicate, ...prev]);
    setActiveNoteId(duplicate.id);

    if (user) {
      saveNoteToFirestore(user.uid, duplicate);
    }
  }, [notes, user]);

  // Toggle pin
  const handleTogglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, isPinned: !n.isPinned, updatedAt: Date.now() };
          if (user) {
            saveNoteToFirestore(user.uid, updated);
          }
          return updated;
        }
        return n;
      })
    );
  }, [user]);

  // Download note as file
  const handleDownload = useCallback((format: 'txt' | 'md') => {
    if (!activeNote) return;
    const safeTitle = (activeNote.title || 'Untitled Note')
      .replace(/[^a-z0-9_\-\s]/gi, '')
      .trim()
      .replace(/\s+/g, '_') || 'note';
    const filename = `${safeTitle}.${format}`;
    downloadFile(filename, activeNote.content, format === 'md' ? 'text/markdown' : 'text/plain');
  }, [activeNote]);

  // Copy note content
  const handleCopyContent = useCallback(async () => {
    if (!activeNote) return;
    const textToCopy = activeNote.title 
      ? `${activeNote.title}\n\n${activeNote.content}` 
      : activeNote.content;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [activeNote]);

  // Clear note content
  const handleClearContent = useCallback(() => {
    if (!activeNote) return;
    if (window.confirm('Are you sure you want to clear the content of this note?')) {
      handleUpdateNote({ content: '' });
    }
  }, [activeNote, handleUpdateNote]);

  // Import file
  const handleImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const newNote: Note = {
        id: 'note-' + Date.now(),
        userId: user?.uid,
        title: titleWithoutExt,
        content: content,
        isPinned: false,
        category: 'General',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      if (user) {
        saveNoteToFirestore(user.uid, newNote);
      }
    };
    reader.readAsText(file);
  }, [user]);

  // Update settings
  const handleUpdateSettings = useCallback((newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: New Note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewNote();
        return;
      }
      // Ctrl/Cmd + S: Save indicator
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 200);
        return;
      }
      // Esc: Exit focus mode or close modals
      if (e.key === 'Escape') {
        if (isFocusMode) setIsFocusMode(false);
        if (isStatsOpen) setIsStatsOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isAuthOpen) setIsAuthOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleNewNote, isFocusMode, isStatsOpen, isSettingsOpen, isAuthOpen]);

  // Dynamic Theme Styling Classes
  const getThemeWrapperClass = () => {
    switch (settings.theme) {
      case 'paper':
        return 'bg-[#f6f3ee] text-[#2c2825] border-[#e8ded1]';
      case 'light':
        return 'bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0]';
      case 'dark':
        return 'bg-[#121215] text-[#f4f4f5] border-[#27272a] dark';
      case 'amber':
        return 'bg-[#fdf8e6] text-[#292524] border-[#fde047]';
      default:
        return 'bg-[#f6f3ee] text-[#2c2825] border-[#e8ded1]';
    }
  };

  const getSheetCardClass = () => {
    switch (settings.theme) {
      case 'paper':
        return 'bg-[#fcfbf9] border-[#e8ded1] shadow-sm';
      case 'light':
        return 'bg-white border-[#e2e8f0] shadow-sm';
      case 'dark':
        return 'bg-[#18181b] border-[#27272a] shadow-md';
      case 'amber':
        return 'bg-[#fef9c3] border-[#fef08a] shadow-sm';
      default:
        return 'bg-white border-neutral-200';
    }
  };

  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden ${getThemeWrapperClass()}`}>
      {/* App Header */}
      <Header
        activeNote={activeNote}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onNewNote={handleNewNote}
        onDownload={handleDownload}
        onCopyContent={handleCopyContent}
        isCopied={isCopied}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        saveStatus={saveStatus}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar notes list */}
        {!isFocusMode && (
          <Sidebar
            notes={notes}
            activeNoteId={activeNote?.id || ''}
            onSelectNote={(id) => setActiveNoteId(id)}
            onNewNote={handleNewNote}
            onDeleteNote={handleDeleteNote}
            onDuplicateNote={handleDuplicateNote}
            onTogglePin={handleTogglePin}
            onImportFile={handleImportFile}
            isOpen={isSidebarOpen}
            onCloseMobile={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Note Paper Sheet Container */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4 md:p-6 transition-all ${
          isFocusMode ? 'max-w-4xl mx-auto w-full' : ''
        }`}>
          <div className={`flex-1 flex flex-col h-full rounded-xl border overflow-hidden transition-all ${getSheetCardClass()}`}>
            <Editor
              note={activeNote}
              settings={settings}
              stats={stats}
              onUpdateNote={handleUpdateNote}
              onClearContent={handleClearContent}
              onImportFile={handleImportFile}
            />
          </div>
        </main>
      </div>

      {/* Undo Delete Toast */}
      {deletedNoteUndo && (
        <div 
          id="undo-delete-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2"
        >
          <span>Note moved to trash</span>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1 text-amber-400 dark:text-amber-600 hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Note Stats Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        activeNote={activeNote}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotepadApp />
    </AuthProvider>
  );
}
