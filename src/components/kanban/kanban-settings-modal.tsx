import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, Edit2, GripVertical, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kanbanConfigService,
  type KanbanColumnConfig,
  type GmailLabel,
} from "@/services/kanban-config";

interface KanbanSettingsModalProps {
  onColumnsUpdate?: () => void;
}

export function KanbanSettingsModal({ onColumnsUpdate }: KanbanSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<KanbanColumnConfig[]>([]);
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load columns and Gmail labels when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [columnsData, labelsData] = await Promise.all([
        kanbanConfigService.getColumns(),
        kanbanConfigService.getGmailLabels(),
      ]);
      setColumns(columnsData);
      setGmailLabels(labelsData);
    } catch (error) {
      console.error("Failed to load Kanban configuration:", error);
      alert("Failed to load configuration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      alert("Column name cannot be empty");
      return;
    }

    setIsCreating(true);
    try {
      await kanbanConfigService.createColumn(newColumnName.trim());
      setNewColumnName("");
      await loadData();
      onColumnsUpdate?.();
    } catch (error) {
      console.error("Failed to create column:", error);
      alert("Failed to create column. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameColumn = async (columnId: string) => {
    if (!editingName.trim()) {
      alert("Column name cannot be empty");
      return;
    }

    try {
      await kanbanConfigService.updateColumn(columnId, {
        column_name: editingName.trim(),
      });
      setEditingColumnId(null);
      setEditingName("");
      await loadData();
      onColumnsUpdate?.();
    } catch (error) {
      console.error("Failed to rename column:", error);
      alert("Failed to rename column. Please try again.");
    }
  };

  const handleDeleteColumn = async (columnId: string, columnName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the column "${columnName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await kanbanConfigService.deleteColumn(columnId);
      await loadData();
      onColumnsUpdate?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to delete column:", error);
      const errorMsg = error?.message || "Failed to delete column";
      alert(errorMsg);
    }
  };

  const handleLabelChange = async (columnId: string, labelId: string | null) => {
    try {
      await kanbanConfigService.updateColumn(columnId, {
        gmail_label_id: labelId,
      });
      await loadData();
      onColumnsUpdate?.();
    } catch (error) {
      console.error("Failed to update label mapping:", error);
      alert("Failed to update label mapping. Please try again.");
    }
  };

  const startEditing = (column: KanbanColumnConfig) => {
    setEditingColumnId(column.column_id);
    setEditingName(column.column_name);
  };

  const cancelEditing = () => {
    setEditingColumnId(null);
    setEditingName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kanban Board Settings</DialogTitle>
          <DialogDescription>
            Customize your Kanban columns and map them to Gmail labels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Existing Columns */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Columns</h3>
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />

                      {editingColumnId === column.column_id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameColumn(column.column_id);
                              } else if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleRenameColumn(column.column_id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{column.column_name}</p>
                            <p className="text-xs text-gray-500">Position: {column.position + 1}</p>
                          </div>

                          {/* Gmail Label Mapping */}
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-gray-400" />
                            <select
                              value={column.gmail_label_id || ""}
                              onChange={(e) =>
                                handleLabelChange(column.column_id, e.target.value || null)
                              }
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">No label</option>
                              {gmailLabels.map((label) => (
                                <option key={label.id} value={label.id}>
                                  {label.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(column)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDeleteColumn(column.column_id, column.column_name)
                              }
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Column */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Add New Column</h3>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Column name..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateColumn();
                      }
                    }}
                    disabled={isCreating}
                  />
                  <Button
                    onClick={handleCreateColumn}
                    disabled={isCreating || !newColumnName.trim()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
