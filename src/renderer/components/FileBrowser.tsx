import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, FolderOpen, Film, ChevronRight, ChevronDown, ChevronUp, RotateCw, X, Upload, FolderInput } from 'lucide-react';
import type { FileEntry, DirectoryContents, VideoFile } from '../../shared/types';

const api = (window as any).videoCast;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[] | null; // null = not loaded, [] = loaded but empty
  expanded: boolean;
}

function TreeItem({
  node,
  depth,
  activePath,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isActive = activePath === node.path;

  return (
    <>
      <div
        className={`tree-item${isActive ? ' active' : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => {
          onSelect(node.path);
          if (!node.expanded) onToggle(node.path);
        }}
      >
        <span
          className="tree-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.path);
          }}
        >
          {node.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="tree-icon">
          {node.expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>
        <span className="tree-name">{node.name}</span>
      </div>
      {node.expanded && node.children && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          activePath={activePath}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

interface Props {
  selectedFile: VideoFile | null;
  onSelect: (filePath: string) => void;
  onClear: () => void;
  initialPath?: string;
  onPathChange?: (path: string) => void;
}

export function FileBrowser({ selectedFile, onSelect, onClear, initialPath, onPathChange }: Props) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirError, setDirError] = useState<string | null>(null);
  const [treeRoots, setTreeRoots] = useState<TreeNode[]>([]);
  const [homePath, setHomePath] = useState('');
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const pathInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const loadDirectory = useCallback(async (dirPath: string): Promise<DirectoryContents> => {
    return api.readDirectory(dirPath);
  }, []);

  const navigateTo = useCallback(async (dirPath: string) => {
    setLoading(true);
    setDirError(null);
    try {
      const result = await loadDirectory(dirPath);
      setCurrentPath(result.path);
      setEntries(result.entries);
      onPathChange?.(result.path);
      if (result.error) {
        setDirError(result.error);
      }
    } catch (err: any) {
      console.error('Failed to read directory:', err);
      setCurrentPath(dirPath);
      setEntries([]);
      onPathChange?.(dirPath);
      setDirError(err?.message || 'Failed to read directory');
    } finally {
      setLoading(false);
    }
  }, [loadDirectory, onPathChange]);

  const ensurePathInTree = useCallback(async (targetPath: string) => {
    const segments = targetPath.split('/').filter(Boolean);

    // Start with root-level directories
    try {
      const rootContents = await loadDirectory('/');
      const rootNodes = rootContents.entries
        .filter((e) => e.isDirectory)
        .map((e) => ({ name: e.name, path: e.path, children: null as TreeNode[] | null, expanded: false }));

      // Expand each segment along the path
      let currentNodes = rootNodes;
      let builtPath = '';
      for (const seg of segments) {
        builtPath += '/' + seg;
        const node = currentNodes.find((n) => n.path === builtPath);
        if (!node) break;
        node.expanded = true;
        try {
          const contents = await loadDirectory(builtPath);
          node.children = contents.entries
            .filter((e) => e.isDirectory)
            .map((e) => ({ name: e.name, path: e.path, children: null, expanded: false }));
          currentNodes = node.children;
        } catch {
          node.children = [];
          break;
        }
      }
      setTreeRoots(rootNodes);
    } catch {
      // Can't read root, just make a single node for the target
      const name = targetPath.split('/').pop() || targetPath;
      try {
        const contents = await loadDirectory(targetPath);
        setTreeRoots([{
          name,
          path: targetPath,
          children: contents.entries
            .filter((e) => e.isDirectory)
            .map((e) => ({ name: e.name, path: e.path, children: null, expanded: false })),
          expanded: true,
        }]);
      } catch {
        setTreeRoots([{ name, path: targetPath, children: [], expanded: true }]);
      }
    }
  }, [loadDirectory]);

  const handleOpenFolder = useCallback(async () => {
    const folderPath = await api.openFolder(currentPath || undefined);
    if (folderPath) {
      await navigateTo(folderPath);
      await ensurePathInTree(folderPath);
    }
  }, [currentPath, navigateTo, ensurePathInTree]);

  // Initialize: load starting directory and build tree
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const startPath = initialPath || null;
    api.getHomePath().then(async (home: string) => {
      setHomePath(home);
      const target = startPath || home;
      await navigateTo(target);
      await ensurePathInTree(target);
    }).catch((err: any) => {
      console.error('Failed to initialize file browser:', err);
      setLoading(false);
    });
  }, [navigateTo, ensurePathInTree, initialPath]);

  const updateNodeInTree = (nodes: TreeNode[], targetPath: string, updater: (node: TreeNode) => TreeNode): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) return updater(node);
      if (node.children && targetPath.startsWith(node.path + '/')) {
        return { ...node, children: updateNodeInTree(node.children, targetPath, updater) };
      }
      return node;
    });
  };

  const handleTreeToggle = useCallback(async (togglePath: string) => {
    // Check current state via functional updater to avoid stale closures
    let needsLoad = false;
    setTreeRoots((prev) => {
      const node = findNode(prev, togglePath);
      if (!node) return prev;

      if (node.expanded) {
        return updateNodeInTree(prev, togglePath, (n) => ({ ...n, expanded: false }));
      }

      if (node.children !== null) {
        return updateNodeInTree(prev, togglePath, (n) => ({ ...n, expanded: true }));
      }

      // Children not loaded yet
      needsLoad = true;
      return prev;
    });

    if (needsLoad) {
      try {
        const result = await loadDirectory(togglePath);
        const children = result.entries
          .filter((e) => e.isDirectory)
          .map((e) => ({ name: e.name, path: e.path, children: null, expanded: false }));

        setTreeRoots((prev) =>
          updateNodeInTree(prev, togglePath, (n) => ({ ...n, children, expanded: true }))
        );
      } catch {
        setTreeRoots((prev) =>
          updateNodeInTree(prev, togglePath, (n) => ({ ...n, children: [], expanded: true }))
        );
      }
    }
  }, [loadDirectory]);

  const handleTreeSelect = useCallback((path: string) => {
    navigateTo(path);
  }, [navigateTo]);

  const navigateUp = () => {
    const parent = currentPath.replace(/\/[^/]+\/?$/, '') || '/';
    navigateTo(parent);
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      navigateTo(entry.path);
    } else {
      onSelect(entry.path);
    }
  };

  const pathSegments = currentPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = (index: number) => {
    const targetPath = '/' + pathSegments.slice(0, index + 1).join('/');
    navigateTo(targetPath);
  };

  const startEditingPath = () => {
    setPathInput(currentPath || '/');
    setEditingPath(true);
    setTimeout(() => {
      pathInputRef.current?.focus();
      pathInputRef.current?.select();
    }, 0);
  };

  const commitPathEdit = () => {
    setEditingPath(false);
    const trimmed = pathInput.trim();
    if (trimmed && trimmed !== currentPath) {
      navigateTo(trimmed);
      ensurePathInTree(trimmed);
    }
  };

  return (
    <div className="file-browser">
      <div className="browser-header">
        <button className="browser-up-btn" onClick={navigateUp} title="Go up">
          <ChevronUp size={14} />
        </button>
        <button className="browser-up-btn" onClick={() => { navigateTo(currentPath || '/'); ensurePathInTree(currentPath || '/'); }} title="Refresh">
          <RotateCw size={14} />
        </button>
        <button className="browser-up-btn" onClick={handleOpenFolder} title="Open Folder">
          <FolderInput size={14} />
        </button>
        {editingPath ? (
          <input
            ref={pathInputRef}
            className="path-input"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPathEdit();
              if (e.key === 'Escape') setEditingPath(false);
            }}
            onBlur={commitPathEdit}
          />
        ) : (
          <div className="breadcrumb" onClick={startEditingPath} title="Click to edit path">
            <button className="breadcrumb-seg" onClick={(e) => { e.stopPropagation(); navigateTo('/'); }}>
              /
            </button>
            {pathSegments.map((seg, i) => (
              <span key={i} style={{ display: 'contents' }}>
                <span className="breadcrumb-sep">/</span>
                <button className="breadcrumb-seg" onClick={(e) => { e.stopPropagation(); handleBreadcrumbClick(i); }}>
                  {seg}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="browser-body">
        <div className="tree-panel">
          {treeRoots.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              activePath={currentPath}
              onToggle={handleTreeToggle}
              onSelect={handleTreeSelect}
            />
          ))}
        </div>

        <div className="file-list">
          {loading ? (
            <div className="file-list-empty">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="file-list-empty-state">
              {dirError ? (
                <>
                  <div className="dir-error-msg">Cannot access this folder</div>
                  <button className="open-folder-btn" onClick={handleOpenFolder}>
                    <FolderInput size={18} />
                    Open Folder
                  </button>
                  <div className="dir-error-hint">
                    Use the button above to grant access via system dialog
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.5 }}>Empty folder</div>
              )}
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.path}
                className={`file-entry${!entry.isDirectory && selectedFile?.path === entry.path ? ' selected' : ''}`}
                onClick={() => handleEntryClick(entry)}
              >
                <span className="file-entry-icon">
                  {entry.isDirectory ? <Folder size={16} /> : <Film size={16} />}
                </span>
                <span className="file-entry-name">{entry.name}</span>
                {!entry.isDirectory && (
                  <span className="file-entry-size">{formatSize(entry.size)}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="drop-target-strip">
        <Upload size={16} />
        <span>Drag & drop video file here</span>
      </div>

      <div className="selected-file-bar">
        {selectedFile ? (
          <>
            <Film size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">{formatSize(selectedFile.size)}</span>
            <button className="clear-file-btn" onClick={onClear} title="Clear selection">
              <X size={14} />
            </button>
          </>
        ) : (
          <span style={{ opacity: 0.5 }}>No file selected</span>
        )}
      </div>
    </div>
  );
}

function findNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children && path.startsWith(node.path + '/')) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
