
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Menu, Download, Trash2, X, Code, AlignLeft, Save, Folder, FolderPlus, Moon, Sun, Maximize2, Minimize2, Crown, Check } from 'lucide-react';

export default function ScriptPad() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(7);
  const [isPremium, setIsPremium] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadData();
    loadTheme();
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    try {
      const studentResult = await window.storage.get('is_student');
      if (studentResult) {
        setIsStudent(studentResult.value === 'true');
      }

      const trialStart = await window.storage.get('trial_start');
      if (!trialStart) {
        await window.storage.set('trial_start', new Date().toISOString());
        setTrialDaysLeft(7);
      } else {
        const startDate = new Date(trialStart.value);
        const now = new Date();
        const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 7 - daysPassed);
        setTrialDaysLeft(daysLeft);
      }

      const premiumStatus = await window.storage.get('premium');
      if (premiumStatus) {
        setIsPremium(premiumStatus.value === 'true');
      }
    } catch (error) {
      console.error('Error checking trial:', error);
    }
  };

  const loadTheme = async () => {
    try {
      const result = await window.storage.get('theme');
      if (result) {
        setDarkMode(result.value === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    try {
      await window.storage.set('theme', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleStudentMode = async () => {
    const newStatus = !isStudent;
    setIsStudent(newStatus);
    try {
      await window.storage.set('is_student', newStatus ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving student status:', error);
    }
  };

  const loadData = async () => {
    try {
      const folderKeys = await window.storage.list('folder:');
      if (folderKeys && folderKeys.keys && folderKeys.keys.length > 0) {
        const loadedFolders = [];
        for (const key of folderKeys.keys) {
          const result = await window.storage.get(key);
          if (result) {
            loadedFolders.push(JSON.parse(result.value));
          }
        }
        setFolders(loadedFolders);
      }

      const fileKeys = await window.storage.list('file:');
      if (fileKeys && fileKeys.keys && fileKeys.keys.length > 0) {
        const loadedFiles = [];
        for (const key of fileKeys.keys) {
          const result = await window.storage.get(key);
          if (result) {
            loadedFiles.push(JSON.parse(result.value));
          }
        }
        setFiles(loadedFiles);
        if (loadedFiles.length > 0 && !activeFileId) {
          setActiveFileId(loadedFiles[0].id);
        }
      } else {
        createNewFile();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      createNewFile();
    }
    setIsLoading(false);
  };

  const createFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !folderName.trim()) return;
    
    const newFolder = {
      id: Date.now().toString(),
      name: folderName.trim(),
      createdAt: new Date().toISOString()
    };
    
    try {
      await window.storage.set(`folder:${newFolder.id}`, JSON.stringify(newFolder));
      setFolders([...folders, newFolder]);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const deleteFolder = async (id) => {
    const filesInFolder = files.filter(f => f.folderId === id);
    if (filesInFolder.length > 0) {
      alert(`Cannot delete folder. It contains ${filesInFolder.length} file(s).`);
      return;
    }
    
    if (window.confirm('Delete this folder?')) {
      try {
        await window.storage.delete(`folder:${id}`);
        setFolders(folders.filter(f => f.id !== id));
        if (activeFolder === id) {
          setActiveFolder(null);
        }
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  };

  const createNewFile = (isCode = false) => {
    const newFile = {
      id: Date.now().toString(),
      name: isCode ? `untitled${files.length + 1}.txt` : `Document ${files.length + 1}`,
      content: '',
      lastModified: new Date().toISOString(),
      isCodeMode: isCode,
      isSaved: true,
      folderId: activeFolder
    };
    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setActiveFileId(newFile.id);
    saveFile(newFile);
  };

  const saveFile = async (file) => {
    try {
      await window.storage.set(`file:${file.id}`, JSON.stringify(file));
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const updateActiveFile = (content) => {
    const updatedFiles = files.map(f =>
      f.id === activeFileId
        ? { ...f, content, lastModified: new Date().toISOString(), isSaved: false }
        : f
    );
    setFiles(updatedFiles);
  };

  const renameFile = (id, newName) => {
    const updatedFiles = files.map(f =>
      f.id === id ? { ...f, name: newName, lastModified: new Date().toISOString() } : f
    );
    setFiles(updatedFiles);
    const updatedFile = updatedFiles.find(f => f.id === id);
    if (updatedFile) {
      saveFile(updatedFile);
    }
  };

  const deleteFile = async (id) => {
    if (files.length === 1) {
      alert('Cannot delete the last file');
      return;
    }
    if (window.confirm('Delete this file?')) {
      try {
        await window.storage.delete(`file:${id}`);
        const updatedFiles = files.filter(f => f.id !== id);
        setFiles(updatedFiles);
        if (activeFileId === id) {
          setActiveFileId(updatedFiles[0]?.id);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const downloadFile = () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;
    
    try {
      const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name || 'document.txt';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const manualSave = () => {
    const updatedFiles = files.map(f =>
      f.id === activeFileId ? { ...f, isSaved: true } : f
    );
    setFiles(updatedFiles);
    const updatedFile = updatedFiles.find(f => f.id === activeFileId);
    if (updatedFile) {
      saveFile(updatedFile);
    }
  };

  const toggleCodeMode = () => {
    const updatedFiles = files.map(f =>
      f.id === activeFileId
        ? { ...f, isCodeMode: !f.isCodeMode, lastModified: new Date().toISOString() }
        : f
    );
    setFiles(updatedFiles);
    const updatedFile = updatedFiles.find(f => f.id === activeFileId);
    if (updatedFile) {
      saveFile(updatedFile);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      manualSave();
      return;
    }
    
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile?.isCodeMode) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const content = e.target.value;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      updateActiveFile(newContent);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const wordCount = activeFile?.content.trim().split(/\s+/).filter(w => w).length || 0;
  const charCount = activeFile?.content.length || 0;
  const lineCount = activeFile?.content.split('\n').length || 0;

  const displayFiles = activeFolder 
    ? files.filter(f => f.folderId === activeFolder)
    : files.filter(f => !f.folderId);

  const getFileIcon = (file) => {
    if (file.isCodeMode) {
      return <Code size={18} className="text-blue-600" />;
    }
    return <FileText size={18} className="text-gray-500" />;
  };

  const getPrice = (regular) => {
    return isStudent ? (regular / 2).toFixed(2) : regular.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading ScriptPad...</div>
      </div>
    );
  }

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`flex h-screen ${bgClass} font-sans`}>
      {/* Feature Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${cardBg} rounded-lg shadow-xl max-w-5xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Compare Plans</h2>
              <button onClick={() => setShowComparisonModal(false)} className={textSecondary}>
                <X size={24} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${borderColor}`}>
                    <th className={`text-left p-4 ${textPrimary}`}>Features</th>
                    <th className={`text-center p-4 ${textPrimary}`}>
                      <div className="font-bold">Free Trial</div>
                      <div className="text-xs font-normal text-green-600">14 Days</div>
                    </th>
                    <th className={`text-center p-4 ${textPrimary}`}>
                      <div className="font-bold">Extension</div>
                      <div className="text-xs font-normal">${getPrice(5)}/mo</div>
                    </th>
                    <th className={`text-center p-4 ${textPrimary}`}>
                      <div className="font-bold">Mobile</div>
                      <div className="text-xs font-normal">${getPrice(7)}/mo</div>
                    </th>
                    <th className={`text-center p-4 ${textPrimary}`}>
                      <div className="font-bold text-purple-600">Bundle</div>
                      <div className="text-xs font-normal text-green-600">${getPrice(7)}/mo</div>
                      <div className="text-xs text-green-600">Best Value!</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Unlimited Files', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Folders & Organization', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Code Mode with Syntax', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Dark Mode', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Focus Mode', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Export & Download', free: true, ext: true, mobile: true, bundle: true },
                    { feature: 'Cloud Sync', free: false, ext: false, mobile: true, bundle: true },
                    { feature: 'Mobile App Access', free: false, ext: false, mobile: true, bundle: true },
                    { feature: 'Browser Extension', free: false, ext: true, mobile: false, bundle: true },
                    { feature: 'Storage Limit', free: '5MB', ext: '10MB', mobile: '100MB', bundle: '100MB' },
                    { feature: 'AI Features', free: false, ext: false, mobile: true, bundle: true },
                    { feature: 'Priority Support', free: false, ext: false, mobile: true, bundle: true },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b ${borderColor}`}>
                      <td className={`p-4 ${textPrimary} font-medium`}>{row.feature}</td>
                      <td className="text-center p-4">
                        {typeof row.free === 'boolean' 
                          ? (row.free ? <Check className="inline text-green-600" size={20} /> : <X className="inline text-gray-400" size={20} />)
                          : <span className={textSecondary}>{row.free}</span>
                        }
                      </td>
                      <td className="text-center p-4">
                        {typeof row.ext === 'boolean' 
                          ? (row.ext ? <Check className="inline text-green-600" size={20} /> : <X className="inline text-gray-400" size={20} />)
                          : <span className={textSecondary}>{row.ext}</span>
                        }
                      </td>
                      <td className="text-center p-4">
                        {typeof row.mobile === 'boolean' 
                          ? (row.mobile ? <Check className="inline text-green-600" size={20} /> : <X className="inline text-gray-400" size={20} />)
                          : <span className={textSecondary}>{row.mobile}</span>
                        }
                      </td>
                      <td className="text-center p-4 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-10">
                        {typeof row.bundle === 'boolean' 
                          ? (row.bundle ? <Check className="inline text-green-600" size={20} /> : <X className="inline text-gray-400" size={20} />)
                          : <span className="font-bold text-purple-600">{row.bundle}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 border ${borderColor} rounded-lg text-center`}>
                <h3 className={`font-bold ${textPrimary} mb-2`}>Extension Only</h3>
                <div className="text-3xl font-bold text-purple-600 mb-2">${getPrice(5)}</div>
                <p className={`text-sm ${textSecondary} mb-4`}>per month</p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className={`w-full py-2 border ${borderColor} rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
                >
                  Select Plan
                </button>
              </div>

              <div className={`p-4 border ${borderColor} rounded-lg text-center`}>
                <h3 className={`font-bold ${textPrimary} mb-2`}>Mobile Only</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">${getPrice(7)}</div>
                <p className={`text-sm ${textSecondary} mb-4`}>per month</p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className={`w-full py-2 border ${borderColor} rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
                >
                  Select Plan
                </button>
              </div>

              <div className="p-4 border-2 border-green-500 rounded-lg text-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 dark:bg-opacity-20">
                <div className="inline-block bg-green-600 text-white text-xs px-3 py-1 rounded-full mb-2">
                  BEST VALUE
                </div>
                <h3 className={`font-bold ${textPrimary} mb-2`}>Bundle Deal</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">${getPrice(7)}</div>
                <p className={`text-sm ${textSecondary} mb-4`}>per month</p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700"
                >
                  Select Plan
                </button>
              </div>
            </div>

            {isStudent && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg text-center">
                <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                  🎓 Student Discount Active - You're saving 50% on all plans!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-lg shadow-xl max-w-lg w-full p-8`}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-4">
                <Crown size={32} className="text-white" />
              </div>
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Upgrade to Premium</h2>
              <p className={textSecondary}>Choose your plan</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className={`p-4 border ${borderColor} rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${textPrimary}`}>📱 Mobile App</h3>
                  <div className="text-right">
                    {isStudent && <span className="text-sm line-through text-gray-500 block">$7/mo</span>}
                    <span className="text-2xl font-bold text-blue-600">${getPrice(7)}/mo</span>
                  </div>
                </div>
                <p className={`text-sm ${textSecondary}`}>Full mobile experience with cloud sync</p>
              </div>

              <div className={`p-4 border-2 border-green-500 rounded-lg bg-green-50 ${darkMode ? 'bg-green-900 bg-opacity-20' : ''}`}>
                <div className="inline-block bg-green-600 text-white text-xs px-3 py-1 rounded-full mb-2">
                  RECOMMENDED
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${textPrimary}`}>🎁 Bundle Deal</h3>
                  <div className="text-right">
                    {isStudent && <span className="text-sm line-through text-gray-500 block">$7/mo</span>}
                    <span className="text-2xl font-bold text-green-600">${getPrice(7)}/mo</span>
                  </div>
                </div>
                <p className={`text-sm ${textSecondary} mb-2`}>
                  Mobile App + Extension (Extension FREE!)
                </p>
              </div>

              <div className={`p-4 border ${borderColor} rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${textPrimary}`}>🔧 Extension Only</h3>
                  <div className="text-right">
                    {isStudent && <span className="text-sm line-through text-gray-500 block">$5/mo</span>}
                    <span className="text-2xl font-bold text-purple-600">${getPrice(5)}/mo</span>
                  </div>
                </div>
                <p className={`text-sm ${textSecondary}`}>Browser extension for desktop</p>
              </div>
            </div>

            {!isPremium && trialDaysLeft > 0 && (
              <div className={`p-4 ${darkMode ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'} rounded-lg mb-4`}>
                <p className="text-center text-blue-600 font-medium">
                  ⏰ {trialDaysLeft} days left in your free trial
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => alert('Payment integration needed')}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className={`w-full py-3 border ${borderColor} ${textPrimary} rounded-lg hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                Continue Free Trial
              </button>
            </div>

            <p className={`text-xs ${textSecondary} text-center mt-4`}>
              No login required • Cancel anytime • 14-day free trial
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {!focusMode && (
        <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed lg:relative lg:translate-x-0 w-64 ${cardBg} border-r ${borderColor} h-full transition-transform duration-300 z-20 flex flex-col`}>
          <div className={`p-4 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center transform -rotate-12">
                  <Code size={20} className="text-white transform rotate-12" />
                </div>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${textPrimary}`}>ScriptPad</h1>
                {!isPremium && (
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Crown size={12} />
                    {trialDaysLeft > 0 ? `${trialDaysLeft} days trial` : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => setShowSidebar(false)} className={`lg:hidden absolute top-4 right-4 ${textSecondary}`}>
              <X size={20} />
            </button>
          </div>

          <div className={`border-b ${borderColor} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-xs font-semibold ${textSecondary} uppercase`}>Folders</h2>
              <button onClick={createFolder} className={`${textSecondary} hover:${textPrimary}`} title="New Folder">
                <FolderPlus size={16} />
              </button>
            </div>
            <div 
              onClick={() => setActiveFolder(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer mb-1 ${
                !activeFolder ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
              }`}
            >
              <Folder size={16} className={textSecondary} />
              <span className={`text-sm ${textPrimary}`}>All Files</span>
            </div>
            {folders.map(folder => (
              <div
                key={folder.id}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer mb-1 ${
                  activeFolder === folder.id ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                }`}
              >
                <div onClick={() => setActiveFolder(folder.id)} className="flex items-center gap-2 flex-1">
                  <Folder size={16} className="text-blue-600" />
                  <span className={`text-sm ${textPrimary}`}>{folder.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {displayFiles.map(file => (
              <div
                key={file.id}
                onClick={() => { setActiveFileId(file.id); setShowSidebar(false); }}
                className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                  activeFileId === file.id
                    ? `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border ${borderColor}`
                    : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} border border-transparent`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={file.name}
                        onChange={(e) => renameFile(file.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full bg-transparent border-none outline-none text-sm font-medium ${textPrimary} truncate`}
                      />
                      {!file.isSaved && <span className="text-xs text-orange-600">● Unsaved</span>}
                      <p className={`text-xs ${textSecondary} mt-1 truncate`}>
                        {file.content ? file.content.substring(0, 40).replace(/\n/g, ' ') : 'Empty'}
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className={`p-3 border-t ${borderColor} space-y-2`}>
            <button
              onClick={() => createNewFile(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors text-sm font-medium"
            >
              <AlignLeft size={16} />
              New Document
            </button>
            <button
              onClick={() => createNewFile(true)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 border ${borderColor} ${textPrimary} rounded-lg hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''} transition-colors text-sm`}
            >
              <Code size={16} />
              New Code File
            </button>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <div className={`${cardBg} border-b ${borderColor} p-3 flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center gap-3">
            {!focusMode && (
              <button onClick={() => setShowSidebar(true)} className={`lg:hidden ${textSecondary} p-2`}>
                <Menu size={24} />
              </button>
            )}
            
            <h2 className={`text-lg font-semibold ${textPrimary}`}>{activeFile?.name || 'Untitled'}</h2>

            <button onClick={toggleCodeMode} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFile?.isCodeMode ? 'bg-blue-600 text-white' : `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`
              }`}>
              {activeFile?.isCodeMode ? <Code size={14} /> : <AlignLeft size={14} />}
              {activeFile?.isCodeMode ? 'Code' : 'Text'}
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => setShowComparisonModal(true)} className={`${textSecondary} hover:${textPrimary} p-2 text-xs`} title="Compare Plans">
              Compare
            </button>
            <button onClick={toggleStudentMode} className={`${textSecondary} hover:${textPrimary} p-2 text-xs`} title="Toggle Student Mode (Demo)">
              {isStudent ? '🎓' : '👤'}
            </button>
            <button onClick={toggleDarkMode} className={`${textSecondary} hover:${textPrimary} p-2`} title="Toggle dark mode">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setFocusMode(!focusMode)} className={`${textSecondary} hover:${textPrimary} p-2`} title="Focus mode">
              {focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={manualSave} className={`${textSecondary} hover:${textPrimary} p-2`} title="Save (Ctrl+S)">
              <Save size={20} />
            </button>
            <button onClick={downloadFile} className={`${textSecondary} hover:${textPrimary} p-2`} title="Download">
              <Download size={20} />
            </button>
            {!isPremium && (
              <button onClick={() => setShowUpgradeModal(true)} className="ml-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 flex items-center gap-1">
                <Crown size={14} />
                Upgrade
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeFile?.isCodeMode && (
            <div className={`absolute left-0 top-0 bottom-0 w-12 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-r ${borderColor} overflow-hidden`}>
              <div className={`py-6 px-2 text-right text-xs ${textSecondary} leading-relaxed font-mono select-none`}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i + 1}>{i + 1}</div>
                ))}
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={activeFile?.content || ''}
            onChange={(e) => updateActiveFile(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeFile?.isCodeMode ? "// Start coding..." : "Start typing..."}
            className={`w-full h-full resize-none outline-none text-base leading-relaxed ${
              activeFile?.isCodeMode
                ? `pl-16 pr-6 py-6 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'} font-mono`
                : `p-6 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`
            }`}
            style={activeFile?.isCodeMode ? {} : { fontFamily: 'system-ui, -apple-system, sans-serif' }}
            spellCheck={!activeFile?.isCodeMode}
          />
        </div>

        <div className={`${cardBg} border-t ${borderColor} px-6 py-3 text-sm ${textSecondary} flex justify-between items-center`}>
          <span>{!activeFile?.isSaved ? '● Unsaved changes' : '✓ Saved'}</span>
          <span>
            {activeFile?.isCodeMode 
              ? `${lineCount} lines · ${charCount} chars`
              : `${wordCount} words · ${charCount} chars`
            }
          </span>
        </div>

        {/* Legal Footer */}
        <div className={`${cardBg} border-t ${borderColor} px-6 py-2 text-xs ${textSecondary} text-center`}>
          <span>© 2025 ScriptPad. All rights reserved.</span>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-blue-600">Terms of Service</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-blue-600">Privacy Policy</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-blue-600">Refund Policy</a>
        </div>
      </div>

      {showSidebar && !focusMode && (
        <div onClick={() => setShowSidebar(false)} className="fixed inset-0 bg-black bg-opacity-30 z-10 lg:hidden" />
      )}
    </div>
  );
}