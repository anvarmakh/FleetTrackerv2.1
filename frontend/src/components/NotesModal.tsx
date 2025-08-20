import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, X, Save, FileText } from 'lucide-react';
import { systemNotesAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Note {
  id: string;
  content: string;
  category: 'general' | 'maintenance' | 'damage' | 'repair' | 'inspection';
  created_by?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerId: string;
  trailerName?: string;
  onNoteChange?: () => void; // Callback to refresh recent notes
}

const categoryColors = {
  general: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  maintenance: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800',
  damage: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800',
  repair: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800',
  inspection: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800',
};

const categoryLabels = {
  general: 'General',
  maintenance: 'Maintenance',
  damage: 'Damage',
  repair: 'Repair',
  inspection: 'Inspection',
};

export default function NotesModal({ isOpen, onClose, trailerId, trailerName, onNoteChange }: NotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    category: 'general' as const,
  });

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await systemNotesAPI.getNotes('trailer', trailerId);
      setNotes(response.data.data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [trailerId]);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, trailerId, loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error('Note content is required');
      return;
    }

    try {
      if (editingNote) {
        await systemNotesAPI.updateNote(editingNote.id, formData);
        toast.success('Note updated successfully');
      } else {
        await systemNotesAPI.createNote('trailer', trailerId, formData);
        toast.success('Note created successfully');
      }
      
      setFormData({ content: '', category: 'general' });
      setShowAddForm(false);
      setEditingNote(null);
      loadNotes();
      onNoteChange?.(); // Refresh recent notes in parent component
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error(editingNote ? 'Failed to update note' : 'Failed to create note');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      content: note.content,
      category: note.category,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await systemNotesAPI.deleteNote(noteId);
      toast.success('Note deleted successfully');
      loadNotes();
      onNoteChange?.(); // Refresh recent notes in parent component
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleCancel = () => {
    setFormData({ content: '', category: 'general' });
    setShowAddForm(false);
    setEditingNote(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes for {trailerName || `Trailer ${trailerId}`}
          </DialogTitle>
          <DialogDescription>
            Manage notes for trailer {trailerName || trailerId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Note Button */}
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingNote ? 'Edit Note' : 'Add New Note'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Content *</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter note content..."
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: 'general' | 'maintenance' | 'damage' | 'repair' | 'inspection') => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingNote ? 'Update Note' : 'Save Note'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No notes yet</h3>
                <p className="text-sm text-muted-foreground">Add your first note to keep track of important information about this trailer.</p>
              </div>
            ) : (
              notes.map((note) => (
                <Card key={note.id} className="group hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                                             <div className="flex-1">
                         <div className="flex items-center gap-2 mb-3">
                           <Badge className={`${categoryColors[note.category]} text-xs font-medium`}>
                             {categoryLabels[note.category]}
                           </Badge>
                         </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3 leading-relaxed">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            {formatDate(note.created_at)}
                          </span>
                          {note.first_name && note.last_name && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                {note.first_name} {note.last_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(note)}
                          className="h-8 w-8 p-0 hover:bg-muted"
                          title="Edit note"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(note.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 